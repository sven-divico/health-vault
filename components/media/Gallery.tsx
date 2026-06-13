'use client';
import { useState } from 'react';

interface Item { id: number; imagePath: string; name: string; caption: string | null; loggedAt: number }

export function Gallery({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<Item | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((it) => (
          <button key={it.id} onClick={() => setOpen(it)} className="group overflow-hidden rounded border border-neutral-200 dark:border-neutral-800">
            <img src={`/api/images/${it.imagePath}`} alt={it.name} className="aspect-square w-full object-cover transition group-hover:opacity-90" />
          </button>
        ))}
      </div>
      {open && (
        <div onClick={() => setOpen(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div onClick={(e) => e.stopPropagation()} className="max-h-full max-w-2xl overflow-auto rounded bg-white p-3 dark:bg-neutral-900">
            <img src={`/api/images/${open.imagePath}`} alt={open.name} className="mb-2 w-full rounded object-contain" />
            <div className="font-medium">{open.name}</div>
            {open.caption && <div className="text-sm text-neutral-500">"{open.caption}"</div>}
            <div className="text-xs text-neutral-400">{new Date(open.loggedAt).toLocaleString()}</div>
          </div>
        </div>
      )}
    </>
  );
}
