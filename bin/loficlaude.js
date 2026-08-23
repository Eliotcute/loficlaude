#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bridgeEntry = resolve(projectRoot, 'bridge', 'index.js');

function printHelp() {
  console.log(`Usage: loficlaude <command>

Commands:
  bridge    Start the local Claude Bridge
`);
}

if (process.argv[2] !== 'bridge') {
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
