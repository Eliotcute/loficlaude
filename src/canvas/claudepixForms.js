const DEFAULT_PALETTE = Object.freeze({
  0: 'rgba(0,0,0,0)',
  1: '#CD7F6A',
  2: '#0f0f0f'
});

// Keep the companion drawable if an archived preset is malformed or unavailable
// in a production bundle. The real archive data remains the normal source.
const FALLBACK_GRID = Object.freeze([
  [0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0],
  [0, 1, 1, 2, 1, 1, 0, 1, 2, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0],
  [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]
]);

export const FORM_DEFS = [
  { id: 'idle_blink', label: '眨眼', archive: 'idle_blink.html' },
  { id: 'idle_breathe', label: '呼吸', archive: 'idle_breathe.html' },
  { id: 'idle_look_around', label: '环顾四周', archive: 'idle_look_around.html' },
  { id: 'work_coding', label: '编码', archive: 'work_coding.html' },
  { id: 'work_think', label: '思考', archive: 'work_think.html' },
  { id: 'expression_sleep', label: '睡觉', archive: 'expression_sleep.html' },
  { id: 'expression_wink', label: '俏皮眨眼', archive: 'expression_wink.html' },
  { id: 'expression_surprise', label: '惊讶', archive: 'expression_surprise.html' },
  { id: 'dance_sway', label: '摇摆', archive: 'dance_sway.html' },
  { id: 'dance_bounce', label: '弹跳', archive: 'dance_bounce.html' },
  { id: 'dance_djmix', label: '打碟', archive: 'dance_djmix.html' },
  { id: 'dance_sway_dj', label: 'DJ 摇摆', archive: 'dance_sway_dj.html' },
  { id: 'dance_bounce_dj', label: 'DJ 弹跳', archive: 'dance_bounce_dj.html' }
];

function toGrid(rows) {
  if (!Array.isArray(rows)) {
    return null;
  }

  return rows.map((row) => {
    if (Array.isArray(row)) {
      return row.map((cell) => Number(cell));
    }

    if (typeof row === 'string') {
      return row.split('').map((cell) => Number(cell));
    }

    return [];
  });
}

function extractScripts(html) {
  return [...`${html ?? ''}`.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
}

function createStubNode() {
  return {
    style: {},
    children: [],
    innerHTML: '',
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    getContext() {
      return null;
    }
  };
}

function evaluatePresetSource(html) {
  const window = {};
  Object.defineProperty(window, 'PixelEngine', {
    configurable: true,
    enumerable: true,
    get() {
      return this._pixelEngine;
    },
    set(value) {
      this._pixelEngine = {
        ...value,
        mount() {
          return { destroy() {} };
        }
      };
    }
  });
  const document = {
    getElementById() {
      return createStubNode();
    },
    createElement() {
      return createStubNode();
    },
    querySelector() {
      return createStubNode();
    },
    querySelectorAll() {
      return [];
    },
    head: createStubNode(),
    body: createStubNode()
  };
  const requestAnimationFrame = () => 0;
  const cancelAnimationFrame = () => {};
  const performance = { now: () => 0 };

  for (const script of extractScripts(html)) {
    const runner = new Function(
      'window',
      'document',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
      script
    );
    runner(window, document, requestAnimationFrame, cancelAnimationFrame, performance);
  }

  return {
    preset: window.PRESET ?? null,
    frames: window.FRAMES ?? null,
    palette: window.PAL ?? null
  };
}

function normalizePalette(palette) {
  if (!palette) {
    return DEFAULT_PALETTE;
  }

  return Array.isArray(palette) ? palette : { ...DEFAULT_PALETTE, ...palette };
}

async function loadArchiveSources() {
  const sources = new Map();
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  if (isBrowser) {
    const archiveManifest = import.meta.glob('../../archive/misc/claudepix_presets/*.html', {
      eager: true,
      query: '?raw',
      import: 'default'
    });

    for (const [path, source] of Object.entries(archiveManifest)) {
      const match = path.match(/\/([^/]+)\.html$/);
      if (match) {
        sources.set(match[1], source);
      }
    }

    return sources;
  }

  const { loadArchiveSourcesFromFs } = await import(/* @vite-ignore */ './claudepixArchiveNode.js');
  return loadArchiveSourcesFromFs();
}

const FORM_SOURCES = await loadArchiveSources();

function parsePreset(def) {
  const source = FORM_SOURCES.get(def.id);
  const parsed = source ? evaluatePresetSource(source) : null;
  const preset = parsed?.preset ?? null;
  const rawFrames = preset?.frames ?? parsed?.frames ?? [];
  const frames = Array.isArray(rawFrames) ? rawFrames : [];
  const palette = normalizePalette(parsed?.palette ?? null);

  const baseFrame = frames.find((frame) => frame?.frame || frame?.rows || frame?.grid) ?? null;
  const baseGrid = toGrid(baseFrame?.frame ?? baseFrame?.rows ?? baseFrame?.grid ?? null);

  const normalizedFrames = frames
    .map((frame) => ({
      hold: Math.max(16, Number(frame?.hold) || 0),
      grid: toGrid(frame?.frame ?? frame?.rows ?? frame?.grid ?? null)
    }))
    .filter((frame) => Array.isArray(frame.grid) && frame.grid.length > 0);
  const safeBaseGrid = baseGrid ?? normalizedFrames[0]?.grid ?? FALLBACK_GRID;

  return {
    id: def.id,
    label: def.label,
    name: preset?.name ?? def.id.replaceAll('_', ' '),
    baseGrid: safeBaseGrid,
    frames: normalizedFrames.length > 0
      ? normalizedFrames
      : [{ hold: 900, grid: safeBaseGrid }],
    palette
  };
}

export const FORMS = FORM_DEFS.map((def) => parsePreset(def));
export const FORM_NAMES = FORMS.map((form) => form.label);

export function getForm(index = 0) {
  const normalized = ((Number(index) || 0) % FORMS.length + FORMS.length) % FORMS.length;
  return FORMS[normalized];
}

export function getFormName(index = 0) {
  return getForm(index).label;
}

export function getFormFrame(formIndex = 0, frameIndex = 0) {
  const form = getForm(formIndex);
  if (!form.frames.length) {
    return { hold: 0, grid: form.baseGrid };
  }

  const normalized = ((Number(frameIndex) || 0) % form.frames.length + form.frames.length) % form.frames.length;
  return form.frames[normalized];
}

function gridDifference(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) {
    return 0;
  }

  const height = Math.max(left.length, right.length);
  let difference = 0;
  for (let row = 0; row < height; row += 1) {
    const leftRow = left[row] ?? [];
    const rightRow = right[row] ?? [];
    const width = Math.max(leftRow.length, rightRow.length);
    for (let column = 0; column < width; column += 1) {
      if ((leftRow[column] ?? 0) !== (rightRow[column] ?? 0)) {
        difference += 1;
      }
    }
  }
  return difference;
}

// The archive loops often start on a neutral standing frame. Previewing the
// most distinctive frame makes a menu selection visibly acknowledge itself.
export function getFormSelectionFrame(formIndex = 0) {
  const form = getForm(formIndex);
  const baseGrid = form.frames[0]?.grid ?? form.baseGrid;
  let selected = { index: 0, frame: form.frames[0] ?? { hold: 900, grid: baseGrid } };
  let largestDifference = -1;

  form.frames.forEach((frame, index) => {
    const difference = gridDifference(frame.grid, baseGrid);
    if (difference > largestDifference) {
      largestDifference = difference;
      selected = { index, frame };
    }
  });

  return selected;
}

export function getPaletteForForm(index = 0) {
  return getForm(index).palette ?? DEFAULT_PALETTE;
}

export const SPECIAL_PALETTE_FORM_IDS = FORMS.filter((form) => form.palette !== DEFAULT_PALETTE).map((form) => form.id);

export { DEFAULT_PALETTE };
