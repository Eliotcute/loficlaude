const { STATUS } = require('./protocol');

// Same interface as createClaudeSession, but the conversation runs in the
// terminal Claude Code process: room messages are pushed through the channel
// and Claude answers with the channel's reply tool.
function createChannelSession({ hub, onStatus, onDelta, onUser, onError, maxUserMessageChars = 32 * 1024 }) {
  let closed = false;

  hub.setReplyHandler((text) => {
    if (closed) return;
    onDelta?.(text);
    onStatus?.(STATUS.DONE);
  });

  return {
    sendUserMessage(text, source = 'browser') {
      const clean = `${text ?? ''}`.trim();
      if (closed || !clean || clean.length > maxUserMessageChars) return false;
      if (!hub.push(clean, source)) {
        onError?.('终端里的 Claude 还没连上 LoFiClaude 频道，请稍后重试');
        return false;
      }
      onUser?.(clean, source);
      onStatus?.(STATUS.THINKING);
      return true;
    },
    close() {
      closed = true;
      hub.setReplyHandler(null);
    }
  };
}

module.exports = { createChannelSession };
