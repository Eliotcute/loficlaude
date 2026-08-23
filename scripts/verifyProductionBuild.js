import { readdir, readFile } from 'node:fs/promises';

const assetsDirectory = new URL('../dist/assets/', import.meta.url);
const assetNames = await readdir(assetsDirectory);
const bundleNames = assetNames.filter((name) => name.endsWith('.js'));

if (bundleNames.length === 0) {
  throw new Error('Production build did not produce a JavaScript bundle.');
}

const bundles = await Promise.all(bundleNames.map((name) => readFile(new URL(name, assetsDirectory), 'utf8')));
const bundleSource = bundles.join('\n');
const presetMarkers = ['window.PRESET', 'idle blink'];

for (const marker of presetMarkers) {
  if (!bundleSource.includes(marker)) {
    throw new Error(`Production bundle is missing Claw preset data: ${marker}`);
  }
}

console.log(`Verified Claw preset data in ${bundleNames.length} production bundle(s).`);
