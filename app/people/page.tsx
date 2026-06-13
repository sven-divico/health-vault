import { cookies } from 'next/headers';
import { adminEnabled, ADMIN_COOKIE, isAdminCookieValid } from '@/lib/admin';
import { listUsers, unlockAdmin, createInviteAction } from './actions';
import { t } from '@/lib/i18n/de';

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  if (!adminEnabled()) {
    return <p className="text-sm text-neutral-500">{t.people.adminDisabled}</p>;
  }
  const unlocked = isAdminCookieValid((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!unlocked) {
    return (
      <form action={async (fd: FormData) => { 'use server'; await unlockAdmin(fd); }} className="max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold">{t.people.title}</h1>
        <input name="secret" type="password" placeholder={t.people.adminSecret}
          className="w-full rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        <button className="rounded bg-neutral-900 px-4 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900">{t.people.unlock}</button>
      </form>
    );
  }
  const people = await listUsers();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t.people.title}</h1>
      <ul className="space-y-1">
        {people.map((p) => (
          <li key={p.id} className="rounded border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
            {p.username} {p.linked ? <span className="text-green-600">· {t.people.linked}</span> : <span className="text-neutral-400">· {t.people.notLinked}</span>}
          </li>
        ))}
      </ul>
      <form action={async (fd: FormData) => { 'use server'; await createInviteAction(fd); }} className="flex max-w-sm gap-2">
        <input name="username" placeholder={t.people.newUsername}
          className="flex-1 rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
        <button className="rounded bg-neutral-900 px-4 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900">{t.people.invite}</button>
      </form>
      <p className="text-xs text-neutral-500">{t.people.inviteHint}</p>
    </div>
  );
}
