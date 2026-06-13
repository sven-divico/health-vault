'use client';
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { t } from '@/lib/i18n/de';

/**
 * Responsive application shell.
 * - md and up: persistent sidebar in normal flow.
 * - below md (phones): sidebar becomes an off-canvas drawer toggled by a hamburger
 *   in a sticky top bar, with a dimmed backdrop, Escape-to-close, scroll lock,
 *   and auto-close on navigation.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock background scroll while the drawer is open (mobile only).
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  return (
    <div className="md:flex">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-neutral-200 bg-neutral-50/85 px-4 py-3 backdrop-blur md:hidden dark:border-neutral-800 dark:bg-neutral-900/85">
        <button
          type="button"
          aria-label={t.common.openMenu}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="-ml-1.5 rounded-lg p-1.5 text-neutral-700 transition-colors hover:bg-neutral-200 active:bg-neutral-300 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-semibold tracking-tight">🩺 {t.brand}</span>
      </header>

      {/* Backdrop (mobile only, when open) */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sidebar: drawer on mobile, static on md+ */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[82%] transform shadow-xl transition-transform duration-300 ease-out md:static md:z-auto md:w-56 md:max-w-none md:transform-none md:shadow-none ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 md:h-screen">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
