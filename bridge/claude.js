const { spawn } = require('node:child_process');
const { StringDecoder } = require('node:string_decoder');
const { STATUS } = require('./protocol');
const { UUID_PATTERN } = require('./sessionState');

const DEFAULT_MAX_OUTPUT_LINE_CHARS = 1024 * 1024;
const DEFAULT_MAX_USER_MESSAGE_CHARS = 32 * 1024;
const DEFAULT_MAX_QUEUED_TURNS = 20;

function createClaudeSession({
  onStatus,
  onDelta,
  onTool,
  onUser,
  onError,
  onInitialized,
  onResumeFailed,
  model,
  workspace,
  sessionId,
  resume = false,
  maxOutputLineChars = DEFAULT_MAX_OUTPUT_LINE_CHARS,
  maxUserMessageChars = DEFAULT_MAX_USER_MESSAGE_CHARS,
  maxQueuedTurns = DEFAULT_MAX_QUEUED_TURNS,
  spawnImpl = spawn
} = {}) {
  let child = null;
  let closed = false;
  let explicitClose = false;
  let disconnectedEmitted = false;
  let stdoutBuffer = '';
  let stderrBuffer = '';
  let stdoutDecoder = new StringDecoder('utf8');
  let stderrDecoder = new StringDecoder('utf8');
  let sawOutputThisTurn = false;
  let turnActive = false;
  let initialized = false;
  let spawnFailed = false;
  let fallbackUsed = false;
  let resumeFailureConfirmed = false;
  let launchSessionId = sessionId;
  let launchResume = resume;
  let activeTurn = null;
  const pendingTurns = [];

  function createLaunchArgs() {
    const args = [
      '-p',
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '--verbose',
      '--include-partial-messages',
      '--permission-mode',
      'dontAsk',
      '--tools',
      '',
      // Named so the shared conversation is recognizable in `claude /resume`.
      '--name',
      'LoFiClaude'
    ];

    if (model) {
      args.push('--model', model);
    }

    if (launchSessionId) {
      if (!UUID_PATTERN.test(launchSessionId)) {
        throw new Error('Claude session id must be a UUID');
      }
      args.push(launchResume ? '--resume' : '--session-id', launchSessionId);
    }

    return args;
  }

  function emitStatus(nextStatus) {
    onStatus?.(nextStatus);
  }

  function emitDelta(text) {
    if (text) {
      sawOutputThisTurn = true;
      onDelta?.(text);
    }
  }

  function emitTool(name) {
    if (name) {
      onTool?.(name);
    }
  }

  function emitError(message) {
    if (message) {
      onError?.(message);
    }
  }

  function parsePossibleJson(line) {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }

  function pickToolName(block) {
    if (!block || typeof block !== 'object') {
      return null;
    }

    if (block.type === 'tool_use' && typeof block.name === 'string') {
      return block.name;
    }

    if (typeof block.tool_name === 'string') {
      return block.tool_name;
    }

    if (typeof block.name === 'string' && typeof block.type === 'string' && block.type.toLowerCase().includes('tool')) {
      return block.name;
    }

    return null;
  }

  function handleAssistantMessage(message) {
    if (!message || !Array.isArray(message.content)) {
      return;
    }

    let textOut = '';
    for (const block of message.content) {
      if (block?.type === 'text' && typeof block.text === 'string') {
        textOut += block.text;
      }

      const toolName = pickToolName(block);
      if (toolName) {
        emitTool(toolName);
        emitStatus(STATUS.WORKING);
      }
    }

    if (!sawOutputThisTurn && textOut.trim()) {
      emitDelta(textOut);
      emitStatus(STATUS.TALKING);
    }
  }

  function handleStreamEvent(event) {
    if (!event || typeof event !== 'object') {
      return;
    }

    const delta = event.delta;
    if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
      emitDelta(delta.text);
      emitStatus(STATUS.TALKING);
    }

    for (const block of [event.content_block, event.contentBlock, event.block, event.delta, event]) {
      const toolName = pickToolName(block);
      if (toolName) {
        emitTool(toolName);
        emitStatus(STATUS.WORKING);
        break;
      }
    }
  }

  function startNextTurn() {
    if (closed) {
      return false;
    }
    if (turnActive || (!activeTurn && pendingTurns.length === 0)) {
      return true;
    }

    const next = activeTurn ?? pendingTurns[0];
    const targetChild = child;
    if (!targetChild.stdin.writable) {
      terminateForProtocolError('Claude input is unavailable');
      return false;
    }

    if (!activeTurn) {
      activeTurn = pendingTurns.shift();
    }
    turnActive = true;
    sawOutputThisTurn = false;

    const payload = {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: next.text }]
      }
    };
    try {
      targetChild.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (error && child === targetChild) {
          terminateForProtocolError('Claude input is unavailable');
        }
      });
    } catch {
      turnActive = false;
      terminateForProtocolError('Claude input is unavailable');
      return false;
    }

    if (closed) {
      return false;
    }

    if (!next.announced) {
      next.announced = true;
      onUser?.(next.text, next.source);
    }
    emitStatus(STATUS.THINKING);
    return true;
  }

  function finishTurn() {
    turnActive = false;
    activeTurn = null;
    startNextTurn();
  }

  function handleResultEvent(payload) {
    const expectedResumeError = `No conversation found with session ID: ${launchSessionId}`;
    if (
      launchResume &&
      !fallbackUsed &&
      !initialized &&
      payload?.is_error === true &&
      payload.session_id === launchSessionId &&
      Array.isArray(payload.errors) &&
      payload.errors.includes(expectedResumeError)
    ) {
      resumeFailureConfirmed = true;
      return;
    }

    if (payload?.is_error || (typeof payload?.subtype === 'string' && payload.subtype.startsWith('error_'))) {
      emitStatus(STATUS.BLOCKED);
      emitError('Claude run ended with an error');
      finishTurn();
      return;
    }

    if (typeof payload?.result === 'string' && payload.result.trim() && !sawOutputThisTurn) {
      emitDelta(payload.result);
    }

    emitStatus(STATUS.DONE);
    finishTurn();
  }

  function handleJsonEvent(payload) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    switch (payload.type) {
      case 'system':
        if (payload.subtype === 'init' && !initialized) {
          initialized = true;
          onInitialized?.();
        } else if (payload.subtype === 'api_retry') {
          emitStatus(STATUS.THINKING);
        }
        break;
      case 'stream_event':
        handleStreamEvent(payload.event);
        break;
      case 'assistant':
        handleAssistantMessage(payload.message);
        break;
      case 'result':
        handleResultEvent(payload);
        break;
      default:
        break;
    }
  }

  function handleStdoutLine(line) {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    const payload = parsePossibleJson(trimmed);
    if (payload) {
      handleJsonEvent(payload);
      return;
    }

    console.error('Claude CLI returned non-JSON output');
    terminateForProtocolError('Claude returned invalid output');
  }

  function consumeChunk(buffer, text, onLine) {
    const parts = text.split('\n');
    let current = buffer;

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (Buffer.byteLength(current) + Buffer.byteLength(part) > maxOutputLineChars) {
        return { buffer: '', overflow: true };
      }

      current += part;
      if (index < parts.length - 1) {
        onLine(current);
        current = '';
        if (closed) {
          return { buffer: '', overflow: false };
        }
      }
    }

    return { buffer: current, overflow: false };
  }

  function terminateForProtocolError(message) {
    if (closed) {
      return;
    }
    closed = true;
    pendingTurns.length = 0;
    turnActive = false;
    activeTurn = null;
    emitStatus(STATUS.BLOCKED);
    emitError(message);
    try {
      child.kill('SIGTERM');
    } catch {
      // The child may already have exited.
    }
  }

  function launchChild() {
    stdoutBuffer = '';
    stderrBuffer = '';
    stdoutDecoder = new StringDecoder('utf8');
    stderrDecoder = new StringDecoder('utf8');
    initialized = false;
    spawnFailed = false;
    resumeFailureConfirmed = false;

    const spawnedChild = spawnImpl('claude', createLaunchArgs(), {
      cwd: workspace || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    child = spawnedChild;

    spawnedChild.stdout.on('data', (chunk) => {
      if (closed || child !== spawnedChild) {
        return;
      }
      const consumed = consumeChunk(stdoutBuffer, stdoutDecoder.write(chunk), handleStdoutLine);
      stdoutBuffer = consumed.buffer;
      if (consumed.overflow) {
        terminateForProtocolError('Claude output exceeded the safety limit');
      }
    });

    spawnedChild.stderr.on('data', (chunk) => {
      if (closed || child !== spawnedChild) {
        return;
      }
      const consumed = consumeChunk(stderrBuffer, stderrDecoder.write(chunk), (line) => {
        const clean = line.trim();
        if (clean) {
          console.error('Claude CLI wrote diagnostic output to stderr');
        }
      });
      stderrBuffer = consumed.buffer;
      if (consumed.overflow) {
        terminateForProtocolError('Claude output exceeded the safety limit');
      }
    });

    spawnedChild.on('error', (error) => {
      if (closed || child !== spawnedChild) {
        return;
      }
      spawnFailed = true;
      console.error(`Failed to start Claude CLI: ${error.message}`);
      terminateForProtocolError('Failed to start Claude CLI');
    });

    spawnedChild.on('close', () => {
      if (child !== spawnedChild) {
        return;
      }

      if (!closed && !explicitClose && resumeFailureConfirmed && !spawnFailed && !fallbackUsed) {
        let replacement = null;
        try {
          replacement = onResumeFailed?.(launchSessionId) ?? null;
        } catch {
          emitError('Claude session recovery failed');
        }
        if (replacement && UUID_PATTERN.test(replacement.sessionId ?? '') && replacement.resume === false) {
          fallbackUsed = true;
          launchSessionId = replacement.sessionId;
          launchResume = false;
          turnActive = false;
          sawOutputThisTurn = false;
          launchChild();
          startNextTurn();
          return;
        }
      }

      closed = true;
      pendingTurns.length = 0;
      turnActive = false;
      activeTurn = null;
      if (!disconnectedEmitted) {
        disconnectedEmitted = true;
        emitStatus(STATUS.DISCONNECTED);
      }
    });

    spawnedChild.stdin.on?.('error', () => {
      if (child === spawnedChild) {
        terminateForProtocolError('Claude input is unavailable');
      }
    });
  }

  launchChild();

  return {
    sendUserMessage(text, source = 'terminal') {
      const clean = `${text ?? ''}`.trim();
      if (closed || !clean || clean.length > maxUserMessageChars) {
        if (clean.length > maxUserMessageChars) {
          emitError('Message too long');
        }
        return false;
      }

      if (pendingTurns.length >= maxQueuedTurns) {
        emitError('Claude message queue is full');
        return false;
      }

      pendingTurns.push({ text: clean, source });
      return startNextTurn();
    },
    close() {
      if (closed) {
        return;
      }

      closed = true;
      explicitClose = true;
      pendingTurns.length = 0;
      turnActive = false;
      activeTurn = null;
      try {
        child.kill('SIGTERM');
      } catch {
        // The child may already have exited.
      }
    }
  };
}

module.exports = {
  createClaudeSession
};
