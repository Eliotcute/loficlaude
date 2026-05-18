const W = 24;
const H = 24;
const PAD = 2;

const CREATURE_20 = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

function createEmptyFrame() {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => 0));
}

function cloneFrame(frame) {
  return frame.map((row) => [...row]);
}

function patch(frame, ops) {
  const out = cloneFrame(frame);
  for (const [r, c, v] of ops) {
    if (r >= 0 && r < H && c >= 0 && c < W) {
      out[r][c] = v;
    }
  }
  return out;
}

function shift(frame, dr, dc) {
  const out = createEmptyFrame();
  for (let r = 0; r < H; r += 1) {
    for (let c = 0; c < W; c += 1) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < H && nc >= 0 && nc < W) {
        out[nr][nc] = frame[r][c];
      }
    }
  }
  return out;
}

function mapBaseCreature() {
  const frame = createEmptyFrame();
  for (let r = 0; r < 20; r += 1) {
    for (let c = 0; c < 20; c += 1) {
      const value = CREATURE_20[r][c];
      if (value === 1) {
        frame[r + PAD][c + PAD] = 1;
      } else if (value === 2) {
        frame[r + PAD][c + PAD] = 2;
      }
    }
  }

  for (let c = 7; c <= 17; c += 1) {
    if (frame[6][c] === 1) {
      frame[6][c] = 3;
    }
  }
  for (const [r, c] of [[5, 7], [5, 8], [5, 16], [5, 17], [4, 8], [4, 9], [4, 15], [4, 16]]) {
    if (frame[r][c] === 1) {
      frame[r][c] = 3;
    }
  }

  return drawStar(frame, 'normal');
}

function drawStar(frame, variant = 'normal') {
  const out = cloneFrame(frame);
  const stars = {
    normal: [[8, 20], [7, 21], [8, 21], [9, 21], [8, 22], [9, 22]],
    twinkle: [[7, 20], [8, 20], [9, 20], [6, 21], [7, 21], [8, 21], [9, 21], [8, 22]],
    burst: [[7, 19], [8, 19], [9, 19], [6, 20], [7, 20], [8, 20], [9, 20], [10, 20], [7, 21], [8, 21], [9, 21], [8, 22]]
  };
  for (const [r, c] of stars[variant] ?? stars.normal) {
    if (r >= 0 && r < H && c >= 0 && c < W) {
      out[r][c] = 4;
    }
  }
  return out;
}

function clearFace(frame) {
  return patch(frame, [
    [8, 9, 1], [8, 15, 1], [9, 9, 1], [9, 15, 1],
    [10, 11, 1], [10, 12, 1], [10, 13, 1], [11, 11, 1], [11, 12, 1], [11, 13, 1]
  ]);
}

function setOpenEyes(frame) {
  return patch(clearFace(frame), [
    [8, 9, 2], [9, 9, 2], [8, 15, 2], [9, 15, 2],
    [10, 11, 2], [10, 12, 2]
  ]);
}

function setBlinkEyes(frame) {
  return patch(clearFace(frame), [
    [9, 9, 2], [9, 10, 2], [9, 15, 2], [9, 16, 2],
    [10, 11, 2], [10, 12, 2]
  ]);
}

function setOpenMouth(frame) {
  return patch(clearFace(frame), [
    [8, 9, 2], [9, 9, 2], [8, 15, 2], [9, 15, 2],
    [10, 11, 2], [10, 12, 2], [11, 11, 2], [11, 12, 2]
  ]);
}

function setSleepFace(frame) {
  return patch(clearFace(frame), [
    [9, 9, 2], [9, 10, 2], [9, 15, 2], [9, 16, 2],
    [10, 11, 2]
  ]);
}

function setThinkingLeft(frame) {
  return patch(clearFace(frame), [
    [8, 8, 2], [9, 8, 2], [8, 14, 2], [9, 14, 2],
    [10, 11, 2], [11, 10, 1], [12, 9, 1]
  ]);
}

function setThinkingRight(frame) {
  return patch(clearFace(frame), [
    [8, 10, 2], [9, 10, 2], [8, 16, 2], [9, 16, 2],
    [10, 12, 2], [11, 13, 1], [12, 14, 1]
  ]);
}

function setWorkingFace(frame) {
  return patch(clearFace(frame), [
    [9, 9, 2], [9, 10, 2], [9, 15, 2], [9, 16, 2],
    [11, 11, 2], [11, 12, 2]
  ]);
}

function setBlockedFace(frame) {
  return patch(clearFace(frame), [
    [8, 8, 2], [8, 9, 2], [8, 10, 2], [9, 8, 2], [9, 9, 2], [9, 10, 2],
    [8, 14, 2], [8, 15, 2], [8, 16, 2], [9, 14, 2], [9, 15, 2], [9, 16, 2],
    [10, 11, 2], [10, 12, 2], [11, 11, 2], [11, 12, 2]
  ]);
}

function setHappyFace(frame) {
  return patch(clearFace(frame), [
    [8, 9, 2], [9, 10, 2], [8, 15, 2], [9, 14, 2],
    [10, 10, 2], [11, 11, 2], [11, 12, 2], [10, 13, 2]
  ]);
}

function setFeet(frame, leftOps, rightOps) {
  const cleared = patch(frame, [
    [16, 7, 0], [17, 7, 0], [18, 7, 0],
    [16, 10, 0], [17, 10, 0], [18, 10, 0],
    [16, 14, 0], [17, 14, 0], [18, 14, 0],
    [16, 17, 0], [17, 17, 0], [18, 17, 0]
  ]);
  return patch(cleared, [...leftOps, ...rightOps]);
}

const LEFT_CENTER = [[16, 7, 1], [17, 7, 1], [18, 7, 1]];
const LEFT_FORWARD = [[16, 8, 1], [17, 8, 1], [18, 8, 1]];
const LEFT_BACK = [[16, 6, 1], [17, 6, 1], [18, 6, 1]];
const LEFT_DOT = [[17, 7, 1]];
const RIGHT_CENTER = [[16, 14, 1], [17, 14, 1], [18, 14, 1]];
const RIGHT_FORWARD = [[16, 15, 1], [17, 15, 1], [18, 15, 1]];
const RIGHT_BACK = [[16, 13, 1], [17, 13, 1], [18, 13, 1]];
const RIGHT_DOT = [[17, 14, 1]];

function neutral() {
  return setFeet(setOpenEyes(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER);
}

const idle1 = neutral();
const idle2 = setFeet(setBlinkEyes(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER);

const walk1 = patch(setFeet(setOpenEyes(mapBaseCreature()), LEFT_FORWARD, RIGHT_BACK), [[15, 5, 1]]);
const walk2 = patch(setFeet(setOpenEyes(mapBaseCreature()), LEFT_BACK, RIGHT_FORWARD), [[15, 18, 1]]);

const talk1 = setFeet(setOpenMouth(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER);
const talk2 = setFeet(setBlinkEyes(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER);

let sleep1 = setFeet(setSleepFace(mapBaseCreature()), LEFT_DOT, RIGHT_DOT);
sleep1 = patch(sleep1, [[17, 5, 0], [17, 16, 0], [16, 8, 1], [16, 9, 1], [16, 12, 1], [16, 13, 1]]);
const sleep2 = patch(sleep1, [[6, 20, 4], [5, 21, 4], [4, 22, 4]]);

const thinking1 = setFeet(setThinkingLeft(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER);
const thinking2 = setFeet(setThinkingRight(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER);

const working1 = patch(setFeet(setWorkingFace(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER), [[5, 7, 2], [5, 8, 2]]);
const working2 = patch(setFeet(setWorkingFace(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER), [[5, 16, 2], [5, 17, 2]]);

const blocked1 = setFeet(setBlockedFace(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER);
const blocked2 = patch(blocked1, [[10, 8, 2], [10, 16, 2]]);

const happy1 = drawStar(setFeet(setHappyFace(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER), 'burst');
const happy2 = drawStar(setFeet(setHappyFace(mapBaseCreature()), LEFT_CENTER, RIGHT_CENTER), 'twinkle');

export const PALETTE = {
  0: 'rgba(0,0,0,0)',
  1: '#df805f',
  2: '#0a0a0a',
  3: '#141414',
  4: '#f2d58e'
};

export const FRAMES = {
  idle_1: idle1,
  idle_2: idle2,
  walk_1: walk1,
  walk_2: walk2,
  talk_1: talk1,
  talk_2: talk2,
  sleep_1: sleep1,
  sleep_2: sleep2,
  thinking_1: thinking1,
  thinking_2: thinking2,
  working_1: working1,
  working_2: working2,
  blocked_1: blocked1,
  blocked_2: blocked2,
  happy_1: happy1,
  happy_2: happy2
};

export const FORM_NAMES = [
  '呼吸',
  '眨眼',
  '环顾四周',
  '编码',
  '思考',
  '弹跳',
  '摇摆',
  'DJ弹跳',
  'DJ摇摆',
  '打碟',
  '眨眼表情',
  '惊讶',
  '睡觉'
];

export function getFormName(index = 0) {
  const normalized = ((Number(index) || 0) % FORM_NAMES.length + FORM_NAMES.length) % FORM_NAMES.length;
  return FORM_NAMES[normalized];
}

function applyFormVariant(frame, formIndex = 0, frameIndex = 0) {
  const normalized = ((Number(formIndex) || 0) % FORM_NAMES.length + FORM_NAMES.length) % FORM_NAMES.length;
  const step = Math.abs(Number(frameIndex) || 0) % 2;

  switch (normalized) {
    case 1:
      return patch(frame, [[7, 9, 3], [7, 15, 3]]);
    case 2:
      return patch(frame, step === 0 ? [[11, 5, 1], [12, 5, 1]] : [[11, 18, 1], [12, 18, 1]]);
    case 3:
      return patch(frame, [[5, 6, 3], [5, 7, 3], [5, 16, 3], [5, 17, 3]]);
    case 4:
      return patch(frame, [[12, 6, 1], [13, 6, 1], [12, 17, 1]]);
    case 5:
      return shift(drawStar(frame, 'normal'), step === 0 ? -1 : 0, 0);
    case 6:
      return shift(drawStar(frame, 'normal'), 0, step === 0 ? -1 : 1);
    case 7:
      return patch(shift(drawStar(frame, 'normal'), step === 0 ? -1 : 0, 0), [[4, 7, 3], [4, 17, 3]]);
    case 8:
      return patch(shift(drawStar(frame, 'normal'), 0, step === 0 ? -1 : 1), [[4, 7, 3], [4, 17, 3]]);
    case 9:
      return patch(drawStar(frame, step === 0 ? 'twinkle' : 'burst'), [[4, 6, 3], [4, 7, 3], [4, 17, 3], [4, 18, 3]]);
    case 10:
      return patch(frame, [[8, 6, 3], [8, 18, 3]]);
    case 11:
      return patch(frame, [[10, 5, 1], [10, 18, 1], [11, 5, 1], [11, 18, 1]]);
    case 12:
      return patch(drawStar(frame, step === 0 ? 'normal' : 'twinkle'), [[17, 21, 4], [16, 22, 4]]);
    default:
      return frame;
  }
}

export function getFrame(mode = 'idle', frameIndex = 0, formIndex = 0) {
  const seq = {
    idle: ['idle_1', 'idle_2'],
    walk: ['walk_1', 'walk_2'],
    talk: ['talk_1', 'talk_2'],
    sleep: ['sleep_1', 'sleep_2'],
    thinking: ['thinking_1', 'thinking_2'],
    working: ['working_1', 'working_2'],
    blocked: ['blocked_1', 'blocked_2'],
    happy: ['happy_1', 'happy_2']
  };
  const keys = seq[mode] ?? seq.idle;
  const baseFrame = FRAMES[keys[frameIndex % keys.length]];
  return applyFormVariant(baseFrame, formIndex, frameIndex);
}
