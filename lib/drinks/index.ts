/**
 * Pure drink helpers (no DB) — safe to import from client components. DB access lives in
 * `lib/drinks/queries.ts`.
 */

/** Concentration-per-100 ml + volume fields of a drink entry (subset of the DB row). */
export interface EntryDrink {
  volumeMl: number | null;
  alcoholGPer100ml: number | null;
  sugarGPer100ml: number | null;
}

export interface AbsoluteDrink {
  volumeMl: number | null;
  alcoholG: number | null;
  sugarG: number | null;
}

/** Absolute amounts: concentration × volume/100 (null-safe). Volume passes through. */
export function absoluteDrink(e: EntryDrink): AbsoluteDrink {
  const scale = (per100: number | null) =>
    per100 == null || e.volumeMl == null ? null : (per100 * e.volumeMl) / 100;
  return { volumeMl: e.volumeMl, alcoholG: scale(e.alcoholGPer100ml), sugarG: scale(e.sugarGPer100ml) };
}
