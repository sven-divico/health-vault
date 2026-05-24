'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? 'login failed');
        setCode(null);
        return;
      }
      const j = await res.json() as { code: string; expiresInSec: number };
      setCode(j.code);
      setSecondsLeft(j.expiresInSec);
    } finally { setSubmitting(false); }
  }

  useEffect(() => {
    if (!code) return;
    const tick = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const poll = setInterval(async () => {
      const r = await fetch('/api/auth/poll');
      const j = await r.json() as { authenticated: boolean };
      if (j.authenticated) {
        clearInterval(poll);
        clearInterval(tick);
        router.push('/');
      }
    }, 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [code, router]);

  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="text-2xl font-semibold">Login</h1>
      {!code ? (
        <form onSubmit={start} className="mt-6 space-y-3">
          <label className="block text-sm">
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
              autoFocus
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !username}
            className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {submitting ? '…' : 'Continue'}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Send this 2-digit code to the Health Vault bot on Telegram within {secondsLeft}s:
          </p>
          <div className="rounded-lg border-2 border-neutral-900 bg-neutral-50 p-6 text-center text-5xl font-mono tracking-widest dark:border-neutral-100 dark:bg-neutral-900">
            {code}
          </div>
          {secondsLeft === 0 && (
            <button
              type="button"
              onClick={() => { setCode(null); setError('Code expired. Try again.'); }}
              className="text-sm underline"
            >
              Restart
            </button>
          )}
        </div>
      )}
    </div>
  );
}
