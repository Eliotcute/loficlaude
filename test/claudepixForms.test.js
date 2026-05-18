import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FORMS,
  FORM_NAMES,
  getFormName,
  getForm,
  getFormFrame,
  DEFAULT_PALETTE,
  SPECIAL_PALETTE_FORM_IDS
} from '../src/canvas/claudepixForms.js';

test('exports all 13 preset forms in the expected order', () => {
  assert.equal(FORMS.length, 13);
  assert.deepEqual(
    FORMS.map((form) => form.id),
    [
      'idle_breathe',
      'idle_blink',
      'idle_look_around',
      'work_coding',
      'work_think',
      'dance_bounce',
      'dance_sway',
      'dance_bounce_dj',
      'dance_sway_dj',
      'dance_djmix',
      'expression_wink',
      'expression_surprise',
      'expression_sleep'
    ]
  );
  assert.deepEqual(FORM_NAMES, ['呼吸', '眨眼', '环顾四周', '编码', '思考', '弹跳', '摇摆', 'DJ弹跳', 'DJ摇摆', '打碟', '眨眼表情', '惊讶', '睡觉']);
});

test('returns exact frame timings and 20x20 grids for extracted presets', () => {
  const idleBreathe = getForm(0);
  assert.equal(idleBreathe.frames.length, 16);
  assert.equal(idleBreathe.frames[0].hold, 500);
  assert.equal(idleBreathe.frames[0].grid, null);
  assert.equal(idleBreathe.frames[1].hold, 200);
  assert.equal(idleBreathe.frames[1].grid[2][1], 0);
  assert.equal(idleBreathe.frames[2].grid[3][5], 1);
  assert.equal(idleBreathe.frames[7].grid[6][7], 0);

  const coding = getForm(3);
  assert.equal(coding.frames.length, 23);
  assert.equal(coding.baseGrid.length, 20);
  assert.equal(coding.baseGrid[13][1], 8);
  assert.equal(coding.frames[0].grid[12][5], 1);
  assert.equal(coding.frames[14].grid[9][13], 7);

  const sleep = getForm(12);
  assert.equal(sleep.frames.length, 24);
  assert.equal(sleep.frames[0].grid[6][7], 0);
  assert.equal(sleep.frames[1].grid[6][7], 1);
});

test('normalizes form and frame lookup helpers', () => {
  assert.equal(getFormName(13), '呼吸');
  assert.equal(getForm(-1).id, 'expression_sleep');
  assert.equal(getFormFrame(3, 23).hold, 180);
  assert.equal(getFormFrame(3, 24).hold, 180);
  assert.deepEqual(DEFAULT_PALETTE, {
    0: 'rgba(0,0,0,0)',
    1: '#CD7F6A',
    2: '#0f0f0f'
  });
  assert.deepEqual(new Set(SPECIAL_PALETTE_FORM_IDS), new Set(['work_coding', 'dance_bounce_dj', 'dance_sway_dj', 'dance_djmix']));
});
