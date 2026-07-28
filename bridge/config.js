const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');

const workspace = path.resolve(__dirname, '..');
const workspaceKey = crypto.createHash('sha256').update(workspace).digest('hex').slice(0, 16);
const userKey = typeof process.getuid === 'function' ? process.getuid() : 'user';
const runtimeDir = path.join(os.tmpdir(), `loficlaude-${userKey}-${workspaceKey}`);

module.exports = {
  port: 9120,
  host: '127.0.0.1',
  authTimeout: 5000,
  defaultModel: 'claude-sonnet-4-6',
  runtimeDir,
  socketPath: path.join(runtimeDir, 'claude.sock'),
  sessionStatePath: path.join(os.tmpdir(), `loficlaude-${userKey}-${workspaceKey}.session.json`),
  resetSession: process.env.LOFICLAUDE_RESET_SESSION === '1',
  workspace,
  maxPayloadBytes: 64 * 1024,
  maxUserMessageChars: 32 * 1024,
  maxUserMessageBytes: 32 * 1024,
  maxSocketLineBytes: 32 * 1024,
  maxSocketPendingWriteBytes: 256 * 1024,
  maxSocketClients: 8,
  eventHistoryLimit: 2000,
  eventHistoryMaxBytes: 1024 * 1024,
  maxClientBufferBytes: 1024 * 1024,
  maxWebSocketClients: 16,
  tmuxEnabled: false,
  tmuxSession: '0',
  tmuxWindowName: 'loficlaude-claude'
};
