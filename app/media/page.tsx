import { requireUser } from '@/lib/auth/server';
import { listMedia } from '@/lib/media';
import { Gallery } from '@/components/media/Gallery';
import { t } from '@/lib/i18n/de';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const user = await requireUser();
  const items = listMedia(user.id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.media.title}</h1>
      {items.length === 0
        ? <p className="text-sm text-neutral-500">{t.media.noImages}</p>
        : <Gallery items={items} />}
    </div>
  );
}
