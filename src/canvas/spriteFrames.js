const W = 24;
const H = 24;

function createBaseFrame() {
  const frame = Array.from({ length: H }, () => Array.from({ length: W }, () => 0));

  for (let y = 4; y <= 18; y += 1) {
    for (let x = 7; x <= 16; x += 1) {
      frame[y][x] = 1;
    }
  }

  for (let y = 2; y <= 5; y += 1) {
    for (let x = 8; x <= 15; x += 1) {
      frame[y][x] = 2;
    }
  }

  frame[9][10] = 3;
  frame[9][13] = 3;
  frame[13][11] = 3;
  frame[13][12] = 3;

  for (let y = 19; y <= 21; y += 1) {
    for (let x = 8; x <= 10; x += 1) frame[y][x] = 1;
    for (let x = 13; x <= 15; x += 1) frame[y][x] = 1;
  }

  return frame;
}

function cloneFrame(frame) {
  return frame.map((row) => [...row]);
}

const idle1 = createBaseFrame();
const idle2 = cloneFrame(idle1);
idle2[9][10] = 0;
idle2[9][13] = 0;
idle2[10][10] = 3;
idle2[10][13] = 3;

const walk1 = cloneFrame(idle1);
walk1[21][10] = 0;
walk1[21][14] = 1;
walk1[18][16] = 1;

const walk2 = cloneFrame(idle1);
walk2[21][8] = 1;
walk2[21][15] = 0;
walk2[18][7] = 1;

const talk1 = cloneFrame(idle1);
talk1[13][11] = 0;
talk1[13][12] = 0;
talk1[14][11] = 3;
talk1[14][12] = 3;

const talk2 = cloneFrame(idle1);

const sleep1 = cloneFrame(idle1);
for (let y = 16; y <= 21; y += 1) {
  for (let x = 7; x <= 16; x += 1) sleep1[y][x] = 0;
}
for (let y = 17; y <= 20; y += 1) {
  for (let x = 8; x <= 14; x += 1) sleep1[y][x] = 1;
}
sleep1[10][17] = 4;
sleep1[9][18] = 4;

const sleep2 = cloneFrame(sleep1);
sleep2[9][18] = 0;
sleep2[8][19] = 4;

const thinking1 = cloneFrame(idle1);
thinking1[8][10] = 0;
thinking1[8][13] = 0;
thinking1[9][9] = 3;
thinking1[9][12] = 3;
thinking1[13][11] = 0;
thinking1[13][12] = 0;
thinking1[14][11] = 3;
thinking1[15][10] = 1;
thinking1[16][9] = 1;

const thinking2 = cloneFrame(thinking1);
thinking2[15][10] = 0;
thinking2[16][9] = 0;
thinking2[15][11] = 1;
thinking2[16][10] = 1;

const working1 = cloneFrame(idle1);
working1[13][11] = 0;
working1[13][12] = 0;
working1[14][11] = 3;
working1[14][12] = 3;
working1[16][16] = 1;
working1[17][17] = 1;
working1[18][18] = 2;
working1[19][17] = 2;

const working2 = cloneFrame(working1);
working2[16][16] = 0;
working2[17][17] = 0;
working2[16][17] = 1;
working2[17][18] = 1;
working2[18][18] = 0;
working2[18][17] = 2;

const blocked1 = cloneFrame(idle1);
blocked1[14][9] = 1;
blocked1[14][14] = 1;
blocked1[15][8] = 1;
blocked1[15][15] = 1;
blocked1[16][7] = 1;
blocked1[16][16] = 1;

const blocked2 = cloneFrame(blocked1);
blocked2[15][8] = 0;
blocked2[15][15] = 0;
blocked2[16][7] = 0;
blocked2[16][16] = 0;
blocked2[15][9] = 1;
blocked2[15][14] = 1;
blocked2[16][8] = 1;
blocked2[16][15] = 1;

const happy1 = cloneFrame(idle1);
for (let y = 19; y <= 21; y += 1) {
  for (let x = 8; x <= 10; x += 1) happy1[y][x] = 0;
  for (let x = 13; x <= 15; x += 1) happy1[y][x] = 0;
}
for (let y = 17; y <= 19; y += 1) {
  for (let x = 8; x <= 10; x += 1) happy1[y][x] = 1;
  for (let x = 13; x <= 15; x += 1) happy1[y][x] = 1;
}
happy1[3][6] = 4;
happy1[4][5] = 4;
happy1[4][6] = 4;
happy1[2][17] = 4;
happy1[3][17] = 4;
happy1[3][18] = 4;

const happy2 = cloneFrame(happy1);
happy2[3][6] = 0;
happy2[4][5] = 0;
happy2[4][6] = 0;
happy2[2][17] = 0;
happy2[3][17] = 0;
happy2[3][18] = 0;
happy2[2][7] = 4;
happy2[3][7] = 4;
happy2[3][8] = 4;
happy2[3][16] = 4;
happy2[4][16] = 4;
happy2[4][17] = 4;

export const PALETTE = {
  0: 'rgba(0,0,0,0)',
  1: '#df805f',
  2: '#141414',
  3: '#0a0a0a',
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

export function getFrame(mode = 'idle', frameIndex = 0) {
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
  return FRAMES[keys[frameIndex % keys.length]];
}
