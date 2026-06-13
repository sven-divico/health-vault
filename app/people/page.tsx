import { cookies } from 'next/headers';
import { adminEnabled, ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';
import { listUsers, unlockAdmin, createInviteAction } from './actions';

// Next 16's @types/react requires form action to return void | Promise<void>,
// but server actions returning non-void values are valid at runtime.
// Cast to satisfy the type checker without changing runtime behaviour.
type FormAction = (formData: FormData) => Promise<void>;

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  if (!adminEnabled()) {
    return <p className="text-sm text-neutral-500">Admin disabled (no ADMIN_SECRET set).</p>;
  }
  const unlocked = isAdminCookieValid((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!unlocked) {
    return (
      <form action={unlockAdmin as unknown as FormAction} className="max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">People</h1>
        <input name="secret" type="password" placeholder="Admin secret"
          className="w-full rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        <button className="rounded bg-neutral-900 px-4 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900">Unlock</button>
      </form>
    );
  }
  const people = await listUsers();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">People</h1>
      <ul className="space-y-1">
        {people.map((p) => (
          <li key={p.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
            {p.username} {p.linked ? <span className="text-green-600">· linked</span> : <span className="text-neutral-400">· not linked</span>}
          </li>
        ))}
      </ul>
      <form action={createInviteAction as unknown as FormAction} className="flex max-w-sm gap-2">
        <input name="username" placeholder="new username"
          className="flex-1 rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        <button className="rounded bg-neutral-900 px-4 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900">Invite</button>
      </form>
      <p className="text-xs text-neutral-500">After inviting, the new invite token is created server-side; share the matching <code>/start &lt;token&gt;</code> from your records or the API.</p>
    </div>
  );
}
