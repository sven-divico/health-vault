'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, type NavItem } from '@/lib/nav';

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col overflow-y-auto border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="px-4 py-4 font-semibold">🩺 Health Vault</div>
      <nav className="flex-1 px-2 pb-6 text-sm">
        {NAV.map((item) => <NavNode key={item.label} item={item} />)}
      </nav>
    </aside>
  );
}

function NavNode({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const active = item.href && (item.href === pathname || (item.href !== '/' && pathname.startsWith(item.href.split('#')[0])));

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-neutral-200/60 dark:hover:bg-neutral-800"
        >
          <span className="w-5 text-center">{item.icon}</span>
          <span>{item.label}</span>
          <span className="ml-auto text-xs opacity-50">{open ? '▾' : '▸'}</span>
        </button>
        {open && (
          <div className="ml-4 border-l border-neutral-200 pl-2 dark:border-neutral-800">
            {item.children.map((c) => <NavNode key={c.label} item={c} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href ?? '#'}
      className={`flex items-center gap-2 rounded px-2 py-2 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 ${active ? 'bg-neutral-200 font-medium dark:bg-neutral-800' : ''}`}
    >
      <span className="w-5 text-center">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}
