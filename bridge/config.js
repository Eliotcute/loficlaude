module.exports = {
  port: 9120,
  host: '127.0.0.1',
  authTimeout: 5000,
  defaultModel: 'claude-sonnet-4-6',
  socketPath: '/tmp/loficlaude-claude.sock',
  workspace: process.cwd(),
  tmuxEnabled: false,
  tmuxSession: '0',
  tmuxWindowName: 'loficlaude-claude'
};
