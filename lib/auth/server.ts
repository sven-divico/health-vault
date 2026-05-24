import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, getAuthenticatedUser } from './index';

export async function requireUser() {
  const c = await cookies();
  const user = getAuthenticatedUser(c.get(SESSION_COOKIE)?.value);
  if (!user) redirect('/login');
  return user;
}
