import type { BatchRecord, CodeRecord } from '../data/types';

export interface CodeMatch {
  batch: BatchRecord;
  code: CodeRecord;
}

export function findCodeMatches(batches: BatchRecord[], query: string): CodeMatch[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const out: CodeMatch[] = [];
  for (const b of batches) {
    for (const c of b.codes) {
      if (c.code.toUpperCase().includes(q)) out.push({ batch: b, code: c });
    }
  }
  return out;
}

export function findCodeExact(batches: BatchRecord[], code: string): CodeMatch | undefined {
  const q = code.trim().toUpperCase();
  for (const b of batches) {
    for (const c of b.codes) {
      if (c.code.toUpperCase() === q) return { batch: b, code: c };
    }
  }
  return undefined;
}
