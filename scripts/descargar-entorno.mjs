import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = [];
for (const category of ['environment', 'fonts']) {
  const destination = path.join(root, 'assets/vendor', category);
  const manifest = JSON.parse(await readFile(path.join(destination, 'sources.json'), 'utf8'));
  sources.push(...manifest.sources.map((source) => ({ ...source, destination })));
}
const check = process.argv.includes('--check');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
let downloaded = 0;

for (const source of sources) {
  const destination = source.destination;
  const output = path.resolve(destination, source.path);
  if (!output.startsWith(destination + path.sep)) throw new Error(`Invalid source path: ${source.path}`);
  let existing;
  try { existing = await readFile(output); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing) {
    if (digest(existing) !== source.sha256) throw new Error(`Source changed: ${source.path}`);
    continue;
  }
  if (check) throw new Error(`Missing source: ${source.path}`);
  const response = await fetch(source.url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${source.path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (digest(bytes) !== source.sha256) throw new Error(`Digest mismatch: ${source.path}`);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, bytes, { flag: 'wx' });
  downloaded += 1;
}

console.log(JSON.stringify({ mode: check ? 'offline-check' : 'download', sources: sources.length, downloaded, licenses: ['CC0-1.0', 'OFL-1.1'] }));
