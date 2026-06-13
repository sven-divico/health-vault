'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NUTRIENTS, absoluteNutrition, formatNutrient, type EntryNutrition } from '@/lib/nutrition';
import { t, fmt } from '@/lib/i18n/de';
import { updateFoodEntry, deleteFoodEntry } from '@/app/food/actions';

export interface FoodRow extends EntryNutrition {
  id: number;
  loggedAt: number;
  imagePath: string | null;
  dishName: string | null;
  rawText: string | null;
  source: 'text' | 'photo';
}

const TH = 'whitespace-nowrap px-3 py-2 text-left font-medium';
const TD = 'whitespace-nowrap px-3 py-2';
const STICKY = 'sticky left-0 z-10 bg-white dark:bg-neutral-950';

export function NutritionTable({ rows }: { rows: FoodRow[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<number | null>(null);
  const [dish, setDish] = useState('');
  const [portion, setPortion] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'warning'; text: string } | null>(null);

  function startEdit(row: FoodRow) {
    setMsg(null);
    setEditId(row.id);
    setDish(row.dishName ?? '');
    setPortion(row.portionG != null ? String(row.portionG) : '');
  }

  async function save(id: number) {
    setBusy(true);
    setMsg(null);
    try {
      const portionG = portion.trim() === '' ? null : Number(portion.replace(',', '.'));
      const res = await updateFoodEntry(id, { dishName: dish, portionG });
      if (!res.ok) { setMsg({ kind: 'error', text: res.error }); return; }
      if (res.warning) setMsg({ kind: 'warning', text: res.warning });
      setEditId(null);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function remove(id: number) {
    if (!window.confirm(t.food.confirmDelete)) return;
    setBusy(true);
    try {
      const res = await deleteFoodEntry(id);
      if (!res.ok) { setMsg({ kind: 'error', text: res.error }); return; }
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      {msg && (
        <p className={`text-sm ${msg.kind === 'error' ? 'text-red-600' : 'text-amber-600'}`}>{msg.text}</p>
      )}
      <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-800">
        <table className="min-w-full border-collapse text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
            <tr>
              <th className={`${TH} ${STICKY} bg-neutral-50 dark:bg-neutral-900`}>{t.food.colTime}</th>
              <th className={TH}>{t.food.colImage}</th>
              <th className={TH}>{t.food.colDish}</th>
              <th className={TH}>{t.food.colPortion}</th>
              {NUTRIENTS.map((n) => (
                <th key={n.key} className={`${TH} text-right`}>{n.label}{n.unit === 'g' ? ' (g)' : ' (kcal)'}</th>
              ))}
              <th className={`${TH} text-right`}>{t.food.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const abs = absoluteNutrition(row);
              const editing = editId === row.id;
              return (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                  <td className={`${TD} ${STICKY} text-xs text-neutral-500`}>{fmt.dateTime(row.loggedAt)}</td>
                  <td className={TD}>
                    {row.imagePath
                      ? <img src={`/api/images/${row.imagePath}`} alt="" className="h-10 w-10 rounded object-cover" />
                      : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className={`${TD} max-w-[14rem] font-medium`}>
                    {editing
                      ? <input value={dish} onChange={(e) => setDish(e.target.value)}
                          placeholder={t.food.dishPlaceholder} autoFocus
                          className="w-40 rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900" />
                      : <span className="block truncate">{row.dishName ?? row.rawText ?? t.food.noLabel}</span>}
                  </td>
                  <td className={`${TD} text-right`}>
                    {editing
                      ? <input value={portion} onChange={(e) => setPortion(e.target.value)} inputMode="decimal"
                          placeholder={t.food.portionPlaceholder}
                          className="w-20 rounded border border-neutral-300 px-2 py-1 text-right dark:border-neutral-700 dark:bg-neutral-900" />
                      : formatNutrient(row.portionG, 'g')}
                  </td>
                  {NUTRIENTS.map((n) => (
                    <td key={n.key} className={`${TD} text-right tabular-nums`}>{formatNutrient(abs[n.key], n.unit)}</td>
                  ))}
                  <td className={`${TD} text-right`}>
                    {editing ? (
                      <span className="flex justify-end gap-2">
                        <button disabled={busy} onClick={() => save(row.id)} className="rounded bg-neutral-900 px-2 py-1 text-xs text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900">{t.food.save}</button>
                        <button disabled={busy} onClick={() => { setEditId(null); setMsg(null); }} className="rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700">{t.food.cancel}</button>
                      </span>
                    ) : (
                      <span className="flex justify-end gap-2">
                        <button disabled={busy} onClick={() => startEdit(row)} aria-label={t.food.edit} title={t.food.edit} className="rounded px-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">✏️</button>
                        <button disabled={busy} onClick={() => remove(row.id)} aria-label={t.food.delete} title={t.food.delete} className="rounded px-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">🗑️</button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={5 + NUTRIENTS.length} className="px-3 py-6 text-center text-sm text-neutral-500">{t.food.noEntries}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
