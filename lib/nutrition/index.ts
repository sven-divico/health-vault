/**
 * Nutrition is stored per-100 g plus a portion in grams; absolute values shown in the UI
 * are derived here. This keeps recalculation trivial: changing the portion scales linearly
 * (no AI), changing the dish only re-estimates the per-100 g values.
 *
 * Pure module (no DB/imports) so it is unit-testable and usable on client and server.
 */

/** The per-100 g + portion fields of a food entry (subset of the DB row). */
export interface EntryNutrition {
  portionG: number | null;
  kcalPer100g: number | null;
  carbsGPer100g: number | null;
  sugarGPer100g: number | null;
  fatGPer100g: number | null;
  saturatedFatGPer100g: number | null;
  proteinGPer100g: number | null;
  fiberGPer100g: number | null;
  saltGPer100g: number | null;
}

export type NutrientKey = 'kcal' | 'carbs' | 'sugar' | 'fat' | 'saturatedFat' | 'protein' | 'fiber' | 'salt';

export interface Nutrient {
  key: NutrientKey;
  label: string;                    // German column/label
  unit: 'kcal' | 'g';
  per100gField: keyof EntryNutrition;
}

/** EU-label "Big 7" + fiber, in display order. */
export const NUTRIENTS: Nutrient[] = [
  { key: 'kcal', label: 'Energie', unit: 'kcal', per100gField: 'kcalPer100g' },
  { key: 'carbs', label: 'Kohlenhydrate', unit: 'g', per100gField: 'carbsGPer100g' },
  { key: 'sugar', label: 'Zucker', unit: 'g', per100gField: 'sugarGPer100g' },
  { key: 'fat', label: 'Fett', unit: 'g', per100gField: 'fatGPer100g' },
  { key: 'saturatedFat', label: 'ges. Fettsäuren', unit: 'g', per100gField: 'saturatedFatGPer100g' },
  { key: 'protein', label: 'Eiweiß', unit: 'g', per100gField: 'proteinGPer100g' },
  { key: 'fiber', label: 'Ballaststoffe', unit: 'g', per100gField: 'fiberGPer100g' },
  { key: 'salt', label: 'Salz', unit: 'g', per100gField: 'saltGPer100g' },
];

export type AbsoluteNutrition = Record<NutrientKey, number | null>;

/** Format a nutrient amount for display (de-DE); kcal rounded to integer, grams to 1 decimal.
 * Null → "—". */
export function formatNutrient(value: number | null, unit: 'kcal' | 'g'): string {
  if (value == null) return '—';
  if (unit === 'kcal') return Math.round(value).toLocaleString('de-DE');
  return value.toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

/** Absolute amount per nutrient = per100g × portion_g / 100 (null if either input is null). */
export function absoluteNutrition(e: EntryNutrition): AbsoluteNutrition {
  const out = {} as AbsoluteNutrition;
  for (const n of NUTRIENTS) {
    const per100 = e[n.per100gField];
    out[n.key] = per100 == null || e.portionG == null ? null : (per100 * e.portionG) / 100;
  }
  return out;
}
