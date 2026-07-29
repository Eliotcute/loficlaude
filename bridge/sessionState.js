const crypto = require('node:crypto');
const fs = require('node:fs');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_STATE_FILE_BYTES = 4096;

function openStateFile(statePath) {
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  return fs.openSync(statePath, fs.constants.O_RDONLY | noFollow);
}

function readRuntimeState(statePath) {
  let descriptor;
  try {
    descriptor = openStateFile(statePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  try {
    const stats = fs.fstatSync(descriptor);
    if (!stats.isFile() || stats.size > MAX_STATE_FILE_BYTES) {
      throw new Error('Claude session state path must be a small regular file');
    }
    if (typeof process.getuid === 'function' && stats.uid !== process.getuid()) {
      throw new Error('Claude session state must be owned by the current user');
    }

    const payload = JSON.parse(fs.readFileSync(descriptor, 'utf8'));
    if (!UUID_PATTERN.test(payload?.sessionId ?? '')) {
      throw new Error('Invalid persisted Claude session id');
    }
    fs.fchmodSync(descriptor, 0o600);

    return {
      sessionId: payload.sessionId,
      initialized: payload.initialized === true,
      needsRewrite: Object.hasOwn(payload, 'bridgeToken')
    };
  } finally {
    fs.closeSync(descriptor);
  }
}

function writeRuntimeState(statePath, state, exclusive) {
  const targetPath = exclusive ? statePath : `${statePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  let descriptor;
  try {
    descriptor = fs.openSync(targetPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(state)}\n`, 'utf8');
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
    }
  }

  if (!exclusive) {
    fs.renameSync(targetPath, statePath);
  }
}

function createFreshRuntimeState() {
  return {
    sessionId: crypto.randomUUID(),
    initialized: false
  };
}

function createSessionState({ statePath, reset = false }) {
  if (!statePath || typeof statePath !== 'string') {
    throw new Error('session state path is required');
  }

  let runtimeState;

  if (reset) {
    runtimeState = createFreshRuntimeState();
    try {
      writeRuntimeState(statePath, runtimeState, true);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
      writeRuntimeState(statePath, runtimeState, false);
    }
  } else {
    runtimeState = readRuntimeState(statePath);
  }

  if (!runtimeState) {
    runtimeState = createFreshRuntimeState();
    try {
      writeRuntimeState(statePath, runtimeState, true);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
      runtimeState = readRuntimeState(statePath);
    }
  } else if (runtimeState.needsRewrite) {
    delete runtimeState.needsRewrite;
    writeRuntimeState(statePath, runtimeState, false);
  }

  return {
    getLaunchOptions() {
      return { sessionId: runtimeState.sessionId, resume: runtimeState.initialized };
    },
    markInitialized() {
      if (runtimeState.initialized) {
        return true;
      }

      const persisted = readRuntimeState(statePath);
      if (!persisted || persisted.sessionId !== runtimeState.sessionId) {
        if (persisted) {
          delete persisted.needsRewrite;
          runtimeState = persisted;
        }
        return false;
      }
      runtimeState.initialized = true;
      writeRuntimeState(statePath, runtimeState, false);
      return true;
    },
    replaceFailedResume(expectedSessionId) {
      const persisted = readRuntimeState(statePath);
      if (!persisted || persisted.sessionId !== expectedSessionId || persisted.initialized !== true) {
        return null;
      }

      runtimeState = createFreshRuntimeState();
      writeRuntimeState(statePath, runtimeState, false);
      return { sessionId: runtimeState.sessionId, resume: false };
    }
  };
}

module.exports = {
  UUID_PATTERN,
  createSessionState
};
