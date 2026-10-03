import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from '/Users/Guest/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(await fs.readFile(path.join(import.meta.dirname, 'generated-assets.json'), 'utf8'));
const output = path.join(root, 'webapp/public/game');
await fs.mkdir(output, { recursive: true });
for (const { id, path: source } of manifest.sourcePaths) {
  await sharp(source).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(output, `${id}.webp`));
  console.log(`${id}.webp`);
}
