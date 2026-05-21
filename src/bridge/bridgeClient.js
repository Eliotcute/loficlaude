export class BridgeClient {
  constructor(options = {}) {
    this.url = options.url ?? 'ws://localhost:9120';
    this.WebSocketImpl = options.WebSocketImpl ?? (typeof WebSocket !== 'undefined' ? WebSocket : null);
    this.socket = null;
    this.token = '';
    this.onStatus = () => {};
    this.onDelta = () => {};
    this.onTool = () => {};
    this.onError = () => {};
    this.onDisconnect = () => {};
  }

  connect(token) {
    const candidate = token ?? this.token;
    const clean = `${candidate ?? ''}`.trim();
    if (!clean) {
      this.onError('Bridge token required');
      return false;
    }

    if (!this.WebSocketImpl) {
      this.onError('WebSocket unavailable in this environment');
      return false;
    }

    if (this.socket && (this.socket.readyState === this.WebSocketImpl.OPEN || this.socket.readyState === this.WebSocketImpl.CONNECTING)) {
      return true;
    }

    this.token = clean;
    this.socket = new this.WebSocketImpl(this.url);

    this.socket.addEventListener('open', () => {
      this.socket?.send(
        JSON.stringify({
          type: 'auth',
          token: this.token
        })
      );
    });

    this.socket.addEventListener('message', (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        this.onError('Invalid bridge payload');
        return;
      }

      if (payload.type === 'status') {
        this.onStatus(payload.value ?? 'disconnected');
        return;
      }

      if (payload.type === 'assistant_delta') {
        this.onDelta(payload.text ?? '');
        return;
      }

      if (payload.type === 'tool_running') {
        this.onTool(payload.name ?? null);
        return;
      }

      if (payload.type === 'error') {
        this.onError(payload.message ?? 'Unknown bridge error');
      }
    });

    this.socket.addEventListener('close', () => {
      this.socket = null;
      this.onDisconnect();
    });

    this.socket.addEventListener('error', () => {
      this.onError('Bridge connection failed');
    });

    return true;
  }

  disconnect() {
    if (!this.socket) {
      this.onDisconnect();
      return;
    }

    const socket = this.socket;
    this.socket = null;
    socket.close();
  }

  sendMessage(text) {
    const clean = `${text ?? ''}`.trim();
    if (!clean || !this.socket || this.socket.readyState !== this.WebSocketImpl.OPEN) {
      return false;
    }

    this.socket.send(
      JSON.stringify({
        type: 'user_message',
        text: clean
      })
    );
    return true;
  }
}

export const bridgeClient = new BridgeClient();
