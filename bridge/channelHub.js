const { safeParse } = require('./protocol');

const MAX_REPLY_CHARS = 64 * 1024;

// Coordinates the terminal handoff over the private channel socket.
// A launcher holds the lease for as long as its connection stays open; the
// Claude Code channel process attaches as the message pipe for that lease.
function createChannelHub({ send, onAcquire, onRelease }) {
  let lease = null;
  let granted = false;
  let pipe = null;
  // Claude Code loaded the channel during this lease, so it opened the session.
  let attached = false;
  let replyHandler = null;

  function deny(client, reason) {
    send(client, { type: 'denied', reason });
  }

  function acquire(client) {
    if (lease) {
      deny(client, 'LoFiClaude 已在另一个终端中打开');
      return;
    }
    lease = client;
    Promise.resolve()
      .then(onAcquire)
      .then((grant) => {
        if (lease !== client) {
          // The launcher left while the Bridge was handing over; undo the handoff.
          if (grant?.ok) onRelease({ attached: false });
          return;
        }
        if (!grant?.ok) {
          lease = null;
          deny(client, grant?.reason || '暂时无法进入终端对话');
          return;
        }
        granted = true;
        send(client, { type: 'granted', sessionId: grant.sessionId, resume: grant.resume === true });
      })
      .catch(() => {
        if (lease === client) {
          lease = null;
          deny(client, '暂时无法进入终端对话');
        }
      });
  }

  function handleLine(line, client) {
    const data = safeParse(line);
    if (data?.type === 'acquire') {
      acquire(client);
    } else if (data?.type === 'attach') {
      if (!granted || pipe) {
        deny(client, '没有等待连接的终端会话');
        return;
      }
      pipe = client;
      attached = true;
    } else if (data?.type === 'reply' && client === pipe) {
      const text = typeof data.text === 'string' ? data.text.trim() : '';
      if (text && text.length <= MAX_REPLY_CHARS) replyHandler?.(text);
    }
  }

  function handleClose(client) {
    if (client === pipe) pipe = null;
    if (client !== lease) return;
    lease = null;
    pipe = null;
    if (!granted) return;
    granted = false;
    const wasAttached = attached;
    attached = false;
    onRelease({ attached: wasAttached });
  }

  return {
    handleLine,
    handleClose,
    push(text, sender) {
      return pipe ? send(pipe, { type: 'message', text, sender }) !== false : false;
    },
    setReplyHandler(handler) {
      replyHandler = handler;
    },
    isAttached: () => pipe !== null
  };
}

module.exports = { createChannelHub, MAX_REPLY_CHARS };
