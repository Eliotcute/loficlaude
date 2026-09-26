#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { connect } from 'node:net';
import { createInterface } from 'node:readline';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bridgeEntry = resolve(projectRoot, 'bridge', 'index.js');
const require = createRequire(import.meta.url);

function printHelp() {
  console.log(`Usage: loficlaude <command>

Commands:
  bridge    Start the local Claude Bridge
  chat      Talk in the Bridge's shared Claude session from this terminal
  music setup  Configure the local NetEase Music CLI and mpv provider
`);
}

// The terminal is a Bridge client, never a second `claude --resume` writer,
// so browser, phone and terminal share one conversation without forking it.
function startChat() {
  const { socketPath } = require(resolve(projectRoot, 'bridge', 'config.js'));
  const socket = connect(socketPath);
  const input = createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });

  socket.setEncoding('utf8');
  socket.once('connect', () => {
    console.log('Connected to the LoFiClaude session. Messages are shared with the room. Ctrl+C to leave.');
    input.prompt();
  });
  socket.on('data', (text) => {
    process.stdout.write(text);
    if (/\[(Done|Blocked|Error[^\]]*|Message not accepted)\]\n$/.test(text)) input.prompt();
  });
  socket.once('error', (error) => {
    const offline = error.code === 'ENOENT' || error.code === 'ECONNREFUSED';
    console.error(offline ? 'Bridge is not running. Start it with: loficlaude bridge' : `Bridge connection failed: ${error.message}`);
    process.exitCode = 1;
    input.close();
  });
  socket.once('close', () => input.close());
  input.on('line', (line) => {
    const text = line.trim();
    if (text) socket.write(`${text}\n`);
    else input.prompt();
  });
  input.once('close', () => socket.end());
}

if (process.argv[2] === 'chat') {
  startChat();
} else if (process.argv[2] === 'music' && process.argv[3] === 'setup') {
  const setup = spawn('ncm-cli', ['configure'], { stdio: 'inherit', env: process.env });
  setup.once('error', (error) => {
    console.error(`Unable to start ncm-cli: ${error.message}`);
    process.exitCode = 1;
  });
  setup.once('exit', (code, signal) => {
    process.exitCode = typeof code === 'number' ? code : signal ? 1 : 0;
  });
} else if (process.argv[2] !== 'bridge') {
  printHelp();
  process.exitCode = process.argv[2] ? 1 : 0;
} else if (!existsSync(bridgeEntry)) {
  console.error(`LoFiClaude Bridge entry not found: ${bridgeEntry}`);
  process.exitCode = 1;
} else {
  const bridge = spawn(process.execPath, [bridgeEntry], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env
  });

  const forwardSignal = (signal) => {
    if (!bridge.killed) {
      bridge.kill(signal);
    }
  };

  process.once('SIGINT', () => forwardSignal('SIGINT'));
  process.once('SIGTERM', () => forwardSignal('SIGTERM'));
  bridge.once('error', (error) => {
    console.error(`Unable to start LoFiClaude Bridge: ${error.message}`);
    process.exitCode = 1;
  });
  bridge.once('exit', (code, signal) => {
    process.exitCode = typeof code === 'number' ? code : signal ? 1 : 0;
  });
}
