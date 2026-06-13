'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, type NavItem } from '@/lib/nav';
import { t } from '@/lib/i18n/de';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-r border-neutral-200 bg-neutral-50 md:h-screen dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between px-4 py-4">
        <span className="font-semibold tracking-tight">🩺 {t.brand}</span>
        <button
          type="button"
          onClick={onNavigate}
          aria-label={t.common.closeMenu}
          className="-mr-1 rounded-lg p-1 text-neutral-500 transition-colors hover:bg-neutral-200 md:hidden dark:hover:bg-neutral-800"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 px-2 pb-6 text-sm">
        {NAV.map((item) => <NavNode key={item.label} item={item} onNavigate={onNavigate} />)}
      </nav>
    </aside>
  );
}

function NavNode({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
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
            {item.children.map((c) => <NavNode key={c.label} item={c} onNavigate={onNavigate} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href ?? '#'}
      onClick={onNavigate}
      className={`flex items-center gap-2 rounded px-2 py-2 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 ${active ? 'bg-neutral-200 font-medium dark:bg-neutral-800' : ''}`}
    >
      <span className="w-5 text-center">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}
