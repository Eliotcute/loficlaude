const { spawn } = require('node:child_process');
const { STATUS } = require('./protocol');

function createClaudeSession({ onStatus, onDelta, onTool, onError, model, workspace }) {
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

  const child = spawn('claude', args, {
    cwd: workspace || process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let closed = false;
  let stdoutBuffer = '';
  let stderrBuffer = '';
  let sawStreamDelta = false;
  let sawToolThisTurn = false;

  function emitStatus(nextStatus) {
    if (typeof onStatus === 'function') {
      onStatus(nextStatus);
    }
  }

  function emitDelta(text) {
    if (!text || typeof onDelta !== 'function') {
      return;
    }

    onDelta(text);
  }

  function emitTool(name) {
    if (!name || typeof onTool !== 'function') {
      return;
    }

    onTool(name);
  }

  function emitError(message) {
    if (!message || typeof onError !== 'function') {
      return;
    }

    onError(message);
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
        sawToolThisTurn = true;
        emitTool(toolName);
        emitStatus(STATUS.WORKING);
      }
    }

    if (!sawStreamDelta && textOut.trim()) {
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
      sawStreamDelta = true;
      emitDelta(delta.text);
      emitStatus(STATUS.TALKING);
    }

    const possibleToolBlocks = [
      event.content_block,
      event.contentBlock,
      event.block,
      event.delta,
      event
    ];

    for (const block of possibleToolBlocks) {
      const toolName = pickToolName(block);
      if (!toolName) {
        continue;
      }

      sawToolThisTurn = true;
      emitTool(toolName);
      emitStatus(STATUS.WORKING);
      break;
    }
  }

  function handleResultEvent(payload) {
    if (payload?.is_error || (typeof payload?.subtype === 'string' && payload.subtype.startsWith('error_'))) {
      emitStatus(STATUS.BLOCKED);
      emitError(payload?.result || 'Claude run ended with error');
      return;
    }

    if (typeof payload?.result === 'string' && payload.result.trim() && !sawStreamDelta) {
      emitDelta(payload.result);
    }

    emitStatus(STATUS.DONE);
  }

  function handleJsonEvent(payload) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    switch (payload.type) {
      case 'system': {
        if (payload.subtype === 'api_retry') {
          emitStatus(STATUS.THINKING);
        }
        break;
      }
      case 'stream_event': {
        handleStreamEvent(payload.event);
        break;
      }
      case 'assistant': {
        handleAssistantMessage(payload.message);
        break;
      }
      case 'result': {
        handleResultEvent(payload);
        break;
      }
      default: {
        break;
      }
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

    emitDelta(`${trimmed}\n`);
    emitStatus(STATUS.TALKING);
  }

  child.stdout.on('data', (chunk) => {
    stdoutBuffer += chunk.toString('utf8');

    let newlineIndex = stdoutBuffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = stdoutBuffer.slice(0, newlineIndex);
      stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
      handleStdoutLine(line);
      newlineIndex = stdoutBuffer.indexOf('\n');
    }
  });

  child.stderr.on('data', (chunk) => {
    stderrBuffer += chunk.toString('utf8');

    let newlineIndex = stderrBuffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = stderrBuffer.slice(0, newlineIndex).trim();
      stderrBuffer = stderrBuffer.slice(newlineIndex + 1);
      if (line) {
        emitError(line);
      }
      newlineIndex = stderrBuffer.indexOf('\n');
    }
  });

  child.on('error', (error) => {
    emitError(`Failed to start claude process: ${error.message}`);
  });

  child.on('close', () => {
    closed = true;
    emitStatus(STATUS.DISCONNECTED);
  });

  return {
    sendUserMessage(text) {
      const clean = `${text ?? ''}`.trim();
      if (closed || !clean || !child.stdin.writable) {
        return;
      }

      sawStreamDelta = false;
      sawToolThisTurn = false;
      emitStatus(STATUS.THINKING);

      const payload = {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: clean }]
        }
      };

      child.stdin.write(`${JSON.stringify(payload)}\n`);
    },
    close() {
      if (closed) {
        return;
      }

      closed = true;
      child.kill('SIGTERM');
    }
  };
}

module.exports = {
  createClaudeSession
};
