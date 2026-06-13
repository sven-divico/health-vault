/** Food-table pagination config (shared by the page and the page-size selector). */
export const FOOD_PAGE_SIZE_COOKIE = 'hv_food_page_size';
export const FOOD_PAGE_SIZES = [25, 50, 100, 150] as const;
export const DEFAULT_FOOD_PAGE_SIZE = 25;

export function toPageSize(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : NaN;
  return (FOOD_PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_FOOD_PAGE_SIZE;
}
