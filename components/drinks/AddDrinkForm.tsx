'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDrinkEntry } from '@/app/drinks/actions';
import { t } from '@/lib/i18n/de';

const INPUT = 'rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900';

export function AddDrinkForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [volume, setVolume] = useState('');
  const [alc, setAlc] = useState('');
  const [sugar, setSugar] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
    const res = await addDrinkEntry({
      name,
      volumeMl: Number(volume.replace(',', '.')),
      alcoholGPer100ml: num(alc),
      sugarGPer100ml: num(sugar),
    });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setName(''); setVolume(''); setAlc(''); setSugar('');
    router.refresh();
  }

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{t.drinks.addTitle}</h2>
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.drinks.namePlaceholder} className={`${INPUT} min-w-[10rem] flex-1`} />
        <input value={volume} onChange={(e) => setVolume(e.target.value)} inputMode="decimal" placeholder={t.drinks.volumePlaceholder} className={`${INPUT} w-28`} />
        <input value={alc} onChange={(e) => setAlc(e.target.value)} inputMode="decimal" placeholder={t.drinks.alcoholOverride} className={`${INPUT} w-44 text-xs`} />
        <input value={sugar} onChange={(e) => setSugar(e.target.value)} inputMode="decimal" placeholder={t.drinks.sugarOverride} className={`${INPUT} w-44 text-xs`} />
        <button disabled={busy || !name || !volume} className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900">{t.drinks.add}</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
