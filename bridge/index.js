const { execFile, execFileSync } = require('node:child_process');
const { createBridgeServer } = require('./server');
const { createClaudeSession } = require('./claude');
const { createTokenManager } = require('./token');
const { STATUS } = require('./protocol');
const config = require('./config');

function runTmux(args, options, callback) {
  let nextOptions = options;
  let nextCallback = callback;

  if (typeof options === 'function') {
    nextCallback = options;
    nextOptions = {};
  }

  execFile(
    'tmux',
    args,
    {
      timeout: 5000,
      ...nextOptions
    },
    (error, stdout) => {
      if (error) {
        nextCallback(error, '');
        return;
      }

      const value = typeof stdout === 'string' ? stdout : stdout?.toString('utf8') ?? '';
      nextCallback(null, value);
    }
  );
}

function runTmuxSync(args, options = {}) {
  return execFileSync('tmux', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5000,
    ...options
  });
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function createTmuxRuntime(options = {}) {
  if (!options.tmuxEnabled) {
    return null;
  }

  try {
    const sessionsRaw = runTmuxSync(['list-sessions', '-F', '#{session_name}'], { encoding: 'utf8' });
    const sessions = sessionsRaw
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!sessions.includes(options.tmuxSession)) {
      return null;
    }

    const windowsRaw = runTmuxSync(['list-windows', '-t', options.tmuxSession, '-F', '#{window_name}'], { encoding: 'utf8' });
    const windows = windowsRaw
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!windows.includes(options.tmuxWindowName)) {
      runTmuxSync(['new-window', '-t', options.tmuxSession, '-n', options.tmuxWindowName]);
    }

    const target = `${options.tmuxSession}:${options.tmuxWindowName}`;
    const command = [
      'claude',
      '-p',
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '--include-partial-messages',
      '--verbose'
    ];

    if (options.defaultModel) {
      command.push('--model', options.defaultModel);
    }

    runTmux(['send-keys', '-t', target, '-l', command.join(' ')], (sendError) => {
      if (sendError) {
        console.warn(`tmux startup send-keys failed: ${sendError.message}`);
        return;
      }

      runTmux(['send-keys', '-t', target, 'C-m'], (enterError) => {
        if (enterError) {
          console.warn(`tmux startup enter failed: ${enterError.message}`);
        }
      });
    });

    function emitFromPayload(payload, handlers) {
      if (!payload || typeof payload !== 'object') {
        return;
      }

      if (payload.type === 'stream_event') {
        const delta = payload.event?.delta;
        if (delta?.type === 'text_delta' && typeof delta.text === 'string' && delta.text.length > 0) {
          handlers.onResponse?.();
          handlers.onDelta?.(delta.text);
          handlers.onStatus?.(STATUS.TALKING);
          return;
        }

        const block = payload.event?.content_block;
        if (block?.type === 'tool_use' && typeof block.name === 'string') {
          handlers.onResponse?.();
          handlers.onTool?.(block.name);
          handlers.onStatus?.(STATUS.WORKING);
        }
        return;
      }

      if (payload.type === 'assistant' && Array.isArray(payload.message?.content)) {
        for (const block of payload.message.content) {
          if (block?.type === 'tool_use' && typeof block.name === 'string') {
            handlers.onResponse?.();
            handlers.onTool?.(block.name);
            handlers.onStatus?.(STATUS.WORKING);
          }
        }
        return;
      }

      if (payload.type === 'result') {
        handlers.onResponse?.();
        if (payload.is_error) {
          handlers.onStatus?.(STATUS.BLOCKED);
          handlers.onError?.(payload.result || 'Claude run ended with error');
          return;
        }

        handlers.onStatus?.(STATUS.DONE);
      }
    }

    return {
      target,
      createSession({ onStatus, onDelta, onTool, onError }) {
        let closed = false;
        let lastLineCount = 0;
        let pendingResponseTimer = null;
        let polling = false;

        function clearPendingResponseTimer() {
          if (pendingResponseTimer) {
            clearTimeout(pendingResponseTimer);
            pendingResponseTimer = null;
          }
        }

        function armPendingResponseTimeout() {
          clearPendingResponseTimer();
          pendingResponseTimer = setTimeout(() => {
            pendingResponseTimer = null;
            onError?.('tmux bridge timeout: no response within 60s');
            onStatus?.(STATUS.BLOCKED);
          }, 60000);
        }

        const pollTimer = setInterval(() => {
          if (closed || polling) {
            return;
          }

          polling = true;
          runTmux(['capture-pane', '-t', target, '-p', '-S', '-400'], { encoding: 'utf8' }, (captureError, output) => {
            polling = false;

            if (closed) {
              return;
            }

            if (captureError) {
              onError?.(`tmux capture-pane failed: ${captureError.message}`);
              return;
            }

            const lines = output.split('\n');
            const normalizedLastLine = Math.min(lastLineCount, lines.length);
            const nextLines = lines.slice(normalizedLastLine);
            lastLineCount = lines.length;

            for (const rawLine of nextLines) {
              const line = rawLine.trim();
              if (!line || !line.startsWith('{')) {
                continue;
              }

              const payload = parseJsonLine(line);
              if (!payload) {
                continue;
              }

              emitFromPayload(payload, {
                onStatus,
                onDelta,
                onTool,
                onError,
                onResponse: clearPendingResponseTimer
              });
            }
          });
        }, 1000);

        return {
          sendUserMessage(text) {
            if (closed) {
              return;
            }

            const clean = `${text ?? ''}`.trim();
            if (!clean) {
              return;
            }

            const payload = JSON.stringify({
              type: 'user',
              message: {
                role: 'user',
                content: [{ type: 'text', text: clean }]
              }
            });

            onStatus?.(STATUS.THINKING);
            armPendingResponseTimeout();

            runTmux(['send-keys', '-t', target, '-l', payload], (sendError) => {
              if (sendError) {
                clearPendingResponseTimer();
                onError?.(`tmux send-keys failed: ${sendError.message}`);
                return;
              }

              runTmux(['send-keys', '-t', target, 'C-m'], (enterError) => {
                if (enterError) {
                  clearPendingResponseTimer();
                  onError?.(`tmux send-keys Enter failed: ${enterError.message}`);
                }
              });
            });
          },
          close() {
            if (closed) {
              return;
            }

            closed = true;
            clearInterval(pollTimer);
            clearPendingResponseTimer();
            onStatus?.(STATUS.DISCONNECTED);
          }
        };
      }
    };
  } catch {
    return null;
  }
}

const tokenManager = createTokenManager();
const tmuxRuntime = createTmuxRuntime(config);
const bridgeServer = createBridgeServer({
  config,
  tokenManager,
  sessionFactory: tmuxRuntime ? (options) => tmuxRuntime.createSession(options) : createClaudeSession
});

let shuttingDown = false;

bridgeServer.on('listening', () => {
  console.log(`🔌 LoFiClaude Bridge running on ws://localhost:${config.port}`);
  console.log(`🔑 Token: ${tokenManager.token}`);
  if (tmuxRuntime) {
    console.log(`📺 Claude session: tmux window '${config.tmuxWindowName}'`);
  } else {
    console.warn('tmux not available, terminal session disabled (fallback to direct spawn)');
  }
});

bridgeServer.on('error', (error) => {
  console.error(`Bridge failed to start: ${error.message}`);
  process.exitCode = 1;
});

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  bridgeServer.close(() => {
    if (tmuxRuntime) {
      console.log(`tmux window ${config.tmuxWindowName} preserved`);
    }
    console.log(`Bridge closed (${signal})`);
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
