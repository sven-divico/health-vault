'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { absoluteDrink, type EntryDrink } from '@/lib/drinks';
import { t, fmt } from '@/lib/i18n/de';
import { updateDrinkEntry, deleteDrinkEntry } from '@/app/drinks/actions';

export interface DrinkRow extends EntryDrink {
  id: number;
  loggedAt: number;
  name: string | null;
  rawText: string | null;
}

const TH = 'whitespace-nowrap px-3 py-2 text-left font-medium';
const TD = 'whitespace-nowrap px-3 py-2';
const STICKY = 'sticky left-0 z-10 bg-white dark:bg-neutral-950';

const fmtMl = (v: number | null) => (v == null ? '—' : Math.round(v).toLocaleString('de-DE'));
const fmtG = (v: number | null) => (v == null ? '—' : v.toLocaleString('de-DE', { maximumFractionDigits: 1 }));

export function DrinksTable({ rows }: { rows: DrinkRow[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [volume, setVolume] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'warning'; text: string } | null>(null);

  function startEdit(row: DrinkRow) {
    setMsg(null);
    setEditId(row.id);
    setName(row.name ?? '');
    setVolume(row.volumeMl != null ? String(row.volumeMl) : '');
  }

  async function save(id: number) {
    setBusy(true);
    setMsg(null);
    try {
      const volumeMl = volume.trim() === '' ? null : Number(volume.replace(',', '.'));
      const res = await updateDrinkEntry(id, { name, volumeMl });
      if (!res.ok) { setMsg({ kind: 'error', text: res.error }); return; }
      if (res.warning) setMsg({ kind: 'warning', text: res.warning });
      setEditId(null);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function remove(id: number) {
    if (!window.confirm(t.drinks.confirmDelete)) return;
    setBusy(true);
    try {
      const res = await deleteDrinkEntry(id);
      if (!res.ok) { setMsg({ kind: 'error', text: res.error }); return; }
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      {msg && <p className={`text-sm ${msg.kind === 'error' ? 'text-red-600' : 'text-amber-600'}`}>{msg.text}</p>}
      <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-800">
        <table className="min-w-full border-collapse text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            <tr>
              <th className={`${TH} ${STICKY} bg-neutral-50 dark:bg-neutral-900`}>{t.drinks.colTime}</th>
              <th className={TH}>{t.drinks.colName}</th>
              <th className={`${TH} text-right`}>{t.drinks.colVolume}</th>
              <th className={`${TH} text-right`}>{t.drinks.colAlcohol}</th>
              <th className={`${TH} text-right`}>{t.drinks.colSugar}</th>
              <th className={`${TH} text-right`}>{t.drinks.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const abs = absoluteDrink(row);
              const editing = editId === row.id;
              return (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                  <td className={`${TD} ${STICKY} text-xs text-neutral-500`}>{fmt.dateTime(row.loggedAt)}</td>
                  <td className={`${TD} max-w-[14rem] font-medium`}>
                    {editing
                      ? <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.drinks.namePlaceholder} autoFocus
                          className="w-40 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900" />
                      : <span className="block truncate">{row.name ?? row.rawText ?? t.drinks.noLabel}</span>}
                  </td>
                  <td className={`${TD} text-right`}>
                    {editing
                      ? <input value={volume} onChange={(e) => setVolume(e.target.value)} inputMode="decimal" placeholder={t.drinks.volumePlaceholder}
                          className="w-24 rounded border border-neutral-300 px-2 py-1 text-right dark:border-neutral-700 dark:bg-neutral-900" />
                      : fmtMl(row.volumeMl)}
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{fmtG(abs.alcoholG)}</td>
                  <td className={`${TD} text-right tabular-nums`}>{fmtG(abs.sugarG)}</td>
                  <td className={`${TD} text-right`}>
                    {editing ? (
                      <span className="flex justify-end gap-2">
                        <button disabled={busy} onClick={() => save(row.id)} className="rounded bg-neutral-900 px-2 py-1 text-xs text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900">{t.drinks.save}</button>
                        <button disabled={busy} onClick={() => { setEditId(null); setMsg(null); }} className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700">{t.drinks.cancel}</button>
                      </span>
                    ) : (
                      <span className="flex justify-end gap-2">
                        <button disabled={busy} onClick={() => startEdit(row)} aria-label={t.drinks.edit} title={t.drinks.edit} className="rounded px-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">✏️</button>
                        <button disabled={busy} onClick={() => remove(row.id)} aria-label={t.drinks.delete} title={t.drinks.delete} className="rounded px-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">🗑️</button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-sm text-neutral-500">{t.drinks.noEntries}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
