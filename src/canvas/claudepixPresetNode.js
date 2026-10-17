import { readdir, readFile } from 'node:fs/promises';

export async function loadPresetSourcesFromFs() {
  const sources = new Map();
  const presetDir = new URL('./claudepix_presets/', import.meta.url);
  const entries = await readdir(presetDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) {
      continue;
    }

    const source = await readFile(new URL(entry.name, presetDir), 'utf8');
    sources.set(entry.name.replace(/\.html$/, ''), source);
  }

  return sources;
}
