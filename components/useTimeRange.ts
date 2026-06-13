'use client';
import { useState } from 'react';
import { TIMERANGE_COOKIE, type RangeKey } from '@/lib/time-range';

const YEAR = 60 * 60 * 24 * 365;

/**
 * Holds the selected time range and persists it client-side to the shared cookie
 * (read server-side on next load to seed `initialRange`, avoiding a hydration flash).
 */
export function useTimeRange(initial: RangeKey): [RangeKey, (k: RangeKey) => void] {
  const [range, setRange] = useState<RangeKey>(initial);
  function change(k: RangeKey) {
    setRange(k);
    document.cookie = `${TIMERANGE_COOKIE}=${k}; path=/; max-age=${YEAR}; samesite=lax`;
  }
  return [range, change];
}
