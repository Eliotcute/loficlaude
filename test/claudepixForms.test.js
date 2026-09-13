import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FORMS,
  FORM_DEFS,
  FORM_NAMES,
  getFormName,
  getForm,
  getFormFrame,
  getFormSelectionFrame,
  DEFAULT_PALETTE,
  SPECIAL_PALETTE_FORM_IDS,
  getPaletteForForm
} from '../src/canvas/claudepixForms.js';

test('exports archive preset forms in the expected order', () => {
  assert.equal(FORMS.length, 13);
  assert.equal(FORM_DEFS.length, 13);
  assert.deepEqual(
    FORMS.map((form) => form.id),
    [
      'idle_blink',
      'idle_breathe',
      'idle_look_around',
      'work_coding',
      'work_think',
      'expression_sleep',
      'expression_wink',
      'expression_surprise',
      'dance_sway',
      'dance_bounce',
      'dance_djmix',
      'dance_sway_dj',
      'dance_bounce_dj'
    ]
  );
});

test('forms have stable labels and accessible frames', () => {
  assert.deepEqual(FORM_NAMES, ['眨眼', '呼吸', '环顾四周', '编码', '思考', '睡觉', '俏皮眨眼', '惊讶', '摇摆', '弹跳', '打碟', 'DJ 摇摆', 'DJ 弹跳']);
  assert.equal(getFormName(0), '眨眼');
  assert.equal(getFormName(13), '眨眼');
  assert.equal(getForm(-1).id, 'dance_bounce_dj');
  assert.ok(getFormFrame(3, 0).hold > 0);
  assert.ok(getFormFrame(10, 0).hold > 0);
  assert.ok(FORMS.every((form) => form.frames.length >= 2));
  assert.ok(FORMS.some((form) => form.frames.length >= 12));
  assert.ok(FORMS.every((form) => form.frames.every((frame) => frame.hold >= 16 && frame.grid?.length > 0)));
  assert.ok(FORMS.every((form) => form.baseGrid?.length > 0));
});

test('every archive preset has a distinct selection preview', () => {
  assert.deepEqual(
    FORM_DEFS.map((def) => def.archive),
    FORMS.map((form) => `${form.id}.html`)
  );
  for (let index = 0; index < FORMS.length; index += 1) {
    const selection = getFormSelectionFrame(index);
    assert.ok(selection.frame?.grid?.length > 0);
    assert.ok(selection.index >= 0 && selection.index < FORMS[index].frames.length);
    assert.notDeepEqual(selection.frame.grid, FORMS[index].frames[0].grid);
  }
});

test('preserves palette defaults and special palette flags', () => {
  assert.deepEqual(DEFAULT_PALETTE, {
    0: 'rgba(0,0,0,0)',
    1: '#CD7F6A',
    2: '#0f0f0f'
  });
  assert.ok(Array.isArray(SPECIAL_PALETTE_FORM_IDS));
  assert.deepEqual(SPECIAL_PALETTE_FORM_IDS, ['work_coding', 'dance_djmix', 'dance_sway_dj', 'dance_bounce_dj']);
  assert.equal(getPaletteForForm(2)[1], '#CD7F6A');
  assert.equal(getPaletteForForm(10)[1], '#CD7F6A');
});
