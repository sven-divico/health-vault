import { t } from '@/lib/i18n/de';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t.settings.title}</h1>
      <p className="text-sm text-neutral-500">{t.settings.placeholder}</p>
    </div>
  );
}
