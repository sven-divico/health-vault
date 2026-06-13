'use client';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n/de';

const YEAR = 60 * 60 * 24 * 365;

/** Generic page-size selector: writes a cookie and resets to page 1 of `basePath`. */
export function PageSizeSelect({ value, cookieName, basePath, sizes }: {
  value: number;
  cookieName: string;
  basePath: string;
  sizes: readonly number[];
}) {
  const router = useRouter();
  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    document.cookie = `${cookieName}=${e.target.value}; path=/; max-age=${YEAR}; samesite=lax`;
    router.push(`${basePath}?page=1`);
    router.refresh();
  }
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-500">
      {t.common.pageSize}
      <select value={value} onChange={onChange}
        className="rounded border border-neutral-300 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900">
        {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  );
}
