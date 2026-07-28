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
  model,
  workspace,
  sessionId,
  resume = false,
  maxOutputLineChars = DEFAULT_MAX_OUTPUT_LINE_CHARS,
  maxUserMessageChars = DEFAULT_MAX_USER_MESSAGE_CHARS,
  maxQueuedTurns = DEFAULT_MAX_QUEUED_TURNS,
  spawnImpl = spawn
} = {}) {
  const args = [
    '-p',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages'
  ];

  if (model) {
    args.push('--model', model);
  }

  if (sessionId) {
    if (!UUID_PATTERN.test(sessionId)) {
      throw new Error('Claude session id must be a UUID');
    }
    args.push(resume ? '--resume' : '--session-id', sessionId);
  }

  const child = spawnImpl('claude', args, {
    cwd: workspace || process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let closed = false;
  let disconnectedEmitted = false;
  let stdoutBuffer = '';
  let stderrBuffer = '';
  const stdoutDecoder = new StringDecoder('utf8');
  const stderrDecoder = new StringDecoder('utf8');
  let sawOutputThisTurn = false;
  let turnActive = false;
  let initialized = false;
  const pendingTurns = [];

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
    if (turnActive || pendingTurns.length === 0) {
      return true;
    }

    const next = pendingTurns[0];
    if (!child.stdin.writable) {
      terminateForProtocolError('Claude input is unavailable');
      return false;
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
      child.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (error) {
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

    pendingTurns.shift();
    onUser?.(next.text, next.source);
    emitStatus(STATUS.THINKING);
    return true;
  }

  function finishTurn() {
    turnActive = false;
    startNextTurn();
  }

  function handleResultEvent(payload) {
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
    emitStatus(STATUS.BLOCKED);
    emitError(message);
    try {
      child.kill('SIGTERM');
    } catch {
      // The child may already have exited.
    }
  }

  child.stdout.on('data', (chunk) => {
    const consumed = consumeChunk(stdoutBuffer, stdoutDecoder.write(chunk), handleStdoutLine);
    stdoutBuffer = consumed.buffer;
    if (consumed.overflow) {
      terminateForProtocolError('Claude output exceeded the safety limit');
    }
  });

  child.stderr.on('data', (chunk) => {
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

  child.on('error', (error) => {
    console.error(`Failed to start Claude CLI: ${error.message}`);
    terminateForProtocolError('Failed to start Claude CLI');
  });

  child.on('close', () => {
    closed = true;
    pendingTurns.length = 0;
    turnActive = false;
    if (!disconnectedEmitted) {
      disconnectedEmitted = true;
      emitStatus(STATUS.DISCONNECTED);
    }
  });

  child.stdin.on?.('error', () => {
    terminateForProtocolError('Claude input is unavailable');
  });

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
      pendingTurns.length = 0;
      turnActive = false;
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
