/** Drinks-table pagination config (shared by the page and the page-size selector). */
export const DRINK_PAGE_SIZE_COOKIE = 'hv_drink_page_size';
export const DRINK_PAGE_SIZES = [25, 50, 100, 150] as const;
export const DEFAULT_DRINK_PAGE_SIZE = 25;

export function toDrinkPageSize(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : NaN;
  return (DRINK_PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_DRINK_PAGE_SIZE;
}
