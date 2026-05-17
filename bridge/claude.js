const { spawn } = require('node:child_process');
const { STATUS } = require('./protocol');

function createClaudeSession({ onStatus, onDelta, onTool, onError }) {
  const child = spawn('claude', [], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let closed = false;

  function emitStatus(nextStatus) {
    if (typeof onStatus === 'function') {
      onStatus(nextStatus);
    }
  }

  function parseAndEmit(chunk) {
    const text = chunk.toString('utf8');
    if (!text.trim()) {
      return;
    }

    if (typeof onDelta === 'function') {
      onDelta(text);
    }

    const lowered = text.toLowerCase();
    if (lowered.includes('thinking')) {
      emitStatus(STATUS.THINKING);
    }

    if (text.includes('```')) {
      emitStatus(STATUS.WORKING);
    }

    if (text.includes('I need your confirmation')) {
      emitStatus(STATUS.BLOCKED);
    }

    const cmdMatch = text.match(/(?:\$|>)\s*(npm|pnpm|yarn|node|git)\s+[^\n]*/i);
    if (cmdMatch && typeof onTool === 'function') {
      onTool(cmdMatch[0].trim().replace(/^[$>]\s*/, ''));
    }

    if (lowered.includes('done') || lowered.includes('completed') || lowered.includes('finished')) {
      emitStatus(STATUS.DONE);
    } else {
      emitStatus(STATUS.TALKING);
    }
  }

  child.stdout.on('data', parseAndEmit);

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString('utf8').trim();
    if (text && typeof onError === 'function') {
      onError(text);
    }
  });

  child.on('error', (error) => {
    if (typeof onError === 'function') {
      onError(`Failed to start claude process: ${error.message}`);
    }
  });

  child.on('close', () => {
    closed = true;
    emitStatus(STATUS.DISCONNECTED);
  });

  return {
    sendUserMessage(text) {
      if (closed || !text || !child.stdin.writable) {
        return;
      }
      emitStatus(STATUS.THINKING);
      child.stdin.write(`${text.trim()}\n`);
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
