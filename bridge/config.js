const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');

const workspace = path.resolve(__dirname, '..');
const workspaceKey = crypto.createHash('sha256').update(workspace).digest('hex').slice(0, 16);
const userKey = typeof process.getuid === 'function' ? process.getuid() : 'user';
const runtimeDir = path.join(os.tmpdir(), `loficlaude-${userKey}-${workspaceKey}`);
// The Claude session id must survive temp-directory cleanup so the shared
// conversation resumes after reboots.
const stateDir = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'loficlaude');

module.exports = {
  port: 9120,
  pairingPort: 9121,
  // LAN mode is opt-in; default remains loopback-only.
  host: '127.0.0.1',
  authTimeout: 5000,
  defaultModel: process.env.LOFICLAUDE_MODEL || 'sonnet',
  runtimeDir,
  socketPath: path.join(runtimeDir, 'claude.sock'),
  channelSocketPath: path.join(runtimeDir, 'channel.sock'),
  handoffTimeout: 30000,
  stateDir,
  sessionStatePath: path.join(stateDir, `session-${workspaceKey}.json`),
  legacySessionStatePath: path.join(os.tmpdir(), `loficlaude-${userKey}-${workspaceKey}.session.json`),
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
