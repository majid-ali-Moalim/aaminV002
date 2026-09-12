const HANDOVER_PREFIX = '[EADS_HANDOVER]';

export type ParsedHandoverNotes = {
  acceptedHospital?: string;
  rejectedHospitals?: Array<{
    id: string;
    hospitalId?: string;
    hospitalName: string;
    branchId?: string;
    branchName?: string;
    location?: string;
    phone?: string;
    reason: string;
    notes: string;
  }>;
};

function parseEmbeddedJson<T>(notes: string, prefix: string): T | null {
  const idx = notes.indexOf(prefix);
  if (idx < 0) return null;
  const after = notes.slice(idx + prefix.length).trimStart();
  if (!after.startsWith('{')) return null;
  let depth = 0;
  for (let i = 0; i < after.length; i++) {
    const ch = after[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(after.slice(0, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function parseHandoverFromClinicalNotes(notes?: string | null): ParsedHandoverNotes | null {
  if (!notes) return null;
  if (notes.startsWith(HANDOVER_PREFIX)) {
    try {
      return JSON.parse(notes.slice(HANDOVER_PREFIX.length)) as ParsedHandoverNotes;
    } catch {
      /* fall through */
    }
  }
  return parseEmbeddedJson<ParsedHandoverNotes>(notes, HANDOVER_PREFIX);
}
