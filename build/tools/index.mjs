// index.mjs — collects every category file in this folder (all except registry/index).
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter(f => f.endsWith('.mjs') && !['registry.mjs', 'index.mjs'].includes(f)).sort();
const all = [];
for (const f of files) all.push(...(await import(`./${f}`)).default);

const seen = new Set();
for (const t of all) { if (seen.has(t.id)) throw new Error(`Duplicate tool id: ${t.id}`); seen.add(t.id); }
export default all;
