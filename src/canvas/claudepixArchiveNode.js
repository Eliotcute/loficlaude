import { readdir, readFile } from 'node:fs/promises';

export async function loadArchiveSourcesFromFs() {
  const sources = new Map();
  const archiveDir = new URL('../../archive/misc/claudepix_presets/', import.meta.url);
  const entries = await readdir(archiveDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) {
      continue;
    }

    const source = await readFile(new URL(entry.name, archiveDir), 'utf8');
    sources.set(entry.name.replace(/\.html$/, ''), source);
  }

  return sources;
}
