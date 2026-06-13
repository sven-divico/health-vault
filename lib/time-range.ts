export type RangeKey = 'today' | '24h' | '7d' | 'month' | 'all';

/** Display order of the range pills. */
export const RANGE_KEYS: RangeKey[] = ['today', '24h', '7d', 'month', 'all'];

export const DEFAULT_RANGE: RangeKey = '7d';

/** Shared cookie name; value is a RangeKey. Read server-side, written client-side. */
export const TIMERANGE_COOKIE = 'hv_timerange';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Lower bound (`from`) for a range, computed in the host's LOCAL time.
 * `to` is always `now`; callers keep points with `t >= from`.
 *  - today: local midnight (00:00 today)
 *  - 24h / 7d / month: rolling windows back from `now`
 *  - all: epoch (everything)
 */
export function rangeBounds(key: RangeKey, now: number): { from: number } {
  switch (key) {
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return { from: d.getTime() };
    }
    case '24h':
      return { from: now - DAY };
    case '7d':
      return { from: now - 7 * DAY };
    case 'month':
      return { from: now - 31 * DAY };
    case 'all':
      return { from: 0 };
  }
}

export function isRangeKey(v: unknown): v is RangeKey {
  return typeof v === 'string' && (RANGE_KEYS as string[]).includes(v);
}

/** Normalize an arbitrary cookie value to a valid RangeKey, falling back to the default. */
export function toRangeKey(v: unknown): RangeKey {
  return isRangeKey(v) ? v : DEFAULT_RANGE;
}

/** Keep series points whose timestamp falls inside the range. */
export function filterByRange<T extends { t: number }>(points: T[], key: RangeKey, now: number): T[] {
  const { from } = rangeBounds(key, now);
  return points.filter((p) => p.t >= from);
}
