import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Health Vault',
  description: 'Personal health tracking vault',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold">Health Vault</Link>
            <Link href="/food" className="text-neutral-600 hover:underline dark:text-neutral-300">Food</Link>
            <Link href="/measures" className="text-neutral-600 hover:underline dark:text-neutral-300">Measures</Link>
            <span className="ml-auto" />
            <Link href="/login" className="text-neutral-600 hover:underline dark:text-neutral-300">Login</Link>
          </div>
        </nav>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
