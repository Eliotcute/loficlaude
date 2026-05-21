import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FORMS,
  FORM_NAMES,
  getFormName,
  getForm,
  getFormFrame,
  DEFAULT_PALETTE,
  SPECIAL_PALETTE_FORM_IDS,
  getPaletteForForm
} from '../src/canvas/claudepixForms.js';

test('exports all 8 preset forms in the expected order', () => {
  assert.equal(FORMS.length, 8);
  assert.deepEqual(
    FORMS.map((form) => form.id),
    ['idle_breathe', 'idle_look_around', 'work_coding', 'work_think', 'nap', 'journal', 'dance_djmix', 'expression_sleep']
  );
  assert.deepEqual(FORM_NAMES, ['呼吸', '环顾四周', '编码', '思考', '小憩', '手账', '打碟', '睡觉']);
});

test('nap and journal have unique non-standing base grids with 4+ frames', () => {
  const nap = getForm(4);
  const journal = getForm(5);

  assert.equal(nap.id, 'nap');
  assert.equal(journal.id, 'journal');
  assert.ok(nap.frames.length >= 4);
  assert.ok(journal.frames.length >= 4);

  assert.equal(nap.baseGrid.length, 20);
  assert.equal(nap.baseGrid[10][3], 2);

  assert.equal(journal.baseGrid.length, 20);
  assert.equal(journal.baseGrid[11][5], 3);

  const journalPalette = getPaletteForForm(5);
  assert.equal(journalPalette[3], '#d4c9a8');
});

test('normalizes form and frame lookup helpers', () => {
  assert.equal(getFormName(8), '呼吸');
  assert.equal(getForm(-1).id, 'expression_sleep');
  assert.equal(getFormFrame(2, 4).hold, getFormFrame(2, 0).hold);
  assert.deepEqual(DEFAULT_PALETTE, {
    0: 'rgba(0,0,0,0)',
    1: '#CD7F6A',
    2: '#0f0f0f'
  });
  assert.deepEqual(new Set(SPECIAL_PALETTE_FORM_IDS), new Set(['journal']));
});
