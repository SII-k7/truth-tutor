import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA_DIR = fileURLToPath(new URL('../data/', import.meta.url));
const FILE = join(DATA_DIR, 'drill-state.json');

export async function loadDrillState() {
  try {
    const raw = await readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.items) ? parsed : { items: [] };
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return { items: [] };
  }
}

export async function saveDrillState(items) {
  const state = { items: Array.isArray(items) ? items : [], updatedAt: new Date().toISOString() };
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  return state;
}
