const CLIENT_TYPES = {
  AUTH: 'auth',
  USER_MESSAGE: 'user_message',
  MUSIC_COMMAND: 'music_command'
};

const SERVER_TYPES = {
  READY: 'ready',
  STATUS: 'status',
  USER_MESSAGE: 'user_message',
  ASSISTANT_DELTA: 'assistant_delta',
  TOOL_RUNNING: 'tool_running',
  ERROR: 'error',
  MUSIC_STATE: 'music_state'
};

const STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  THINKING: 'thinking',
  TALKING: 'talking',
  WORKING: 'working',
  BLOCKED: 'blocked',
  DONE: 'done',
  DISCONNECTED: 'disconnected'
};

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function serialize(payload) {
  return JSON.stringify(payload);
}

module.exports = {
  CLIENT_TYPES,
  SERVER_TYPES,
  STATUS,
  safeParse,
  serialize
};
