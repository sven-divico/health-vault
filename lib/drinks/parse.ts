export interface ParsedDrink {
  name: string;
  volumeMl: number;
}

/**
 * Parse a `/drink <name> <volume>` body. The volume is the trailing token; everything before
 * it is the name. Accepts `500ml`, `0.5l`, `0,5l`, and bare `500` (= ml). Returns null when
 * there is no name or no positive volume.
 */
export function parseDrink(text: string): ParsedDrink | null {
  const m = text.trim().match(/^(.*?)\s+(\d+(?:[.,]\d+)?)\s*(ml|l)?$/i);
  if (!m) return null;
  const name = m[1].trim();
  if (!name) return null;
  const num = parseFloat(m[2].replace(',', '.'));
  const unit = (m[3] ?? 'ml').toLowerCase();
  const volumeMl = unit === 'l' ? num * 1000 : num;
  if (!(volumeMl > 0)) return null;
  return { name, volumeMl };
}
