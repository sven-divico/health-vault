export interface ParsedActivity {
  category: string | null;
  durationMin: number | null;
  note: string | null;
}

const DURATION_RE = /(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hour|hours|min|mins|minute|minutes)\b/i;

export function parseActivity(input: string): ParsedActivity {
  const text = input.trim();
  if (!text) return { category: null, durationMin: null, note: null };

  let durationMin: number | null = null;
  let working = text;

  const dm = working.match(DURATION_RE);
  if (dm && dm.index != null) {
    const value = parseFloat(dm[1].replace(',', '.'));
    const isHour = dm[2].toLowerCase().startsWith('h');
    durationMin = Math.round(isHour ? value * 60 : value);
    working = (working.slice(0, dm.index) + working.slice(dm.index + dm[0].length)).trim();
  }

  let category: string | null = null;
  const words = working.split(/\s+/).filter(Boolean);
  if (words.length && /^[a-zA-Z]+$/.test(words[0])) {
    category = words[0].toLowerCase();
    words.shift();
  }
  const note = words.join(' ').trim() || null;
  return { category, durationMin, note };
}
