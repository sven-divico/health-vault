import { t } from '@/lib/i18n/de';

export interface NavItem {
  label: string;
  icon: string;       // short emoji/glyph placeholder for v1
  href?: string;      // leaf links
  children?: NavItem[];
}

export const NAV: NavItem[] = [
  { label: t.nav.dashboard, icon: '🏠', href: '/' },
  { label: t.nav.activity, icon: '🏃', href: '/measures' }, // activity lives under measures for v1
  {
    label: t.nav.nutrition, icon: '🍽️', children: [
      { label: t.nav.food, icon: '•', href: '/food' },
      { label: t.nav.drinks, icon: '•', href: '/drinks' },
    ],
  },
  {
    label: t.nav.body, icon: '⚖️', children: [
      { label: t.nav.weight, icon: '•', href: '/measures#weight' },
      { label: t.nav.mood, icon: '•', href: '/measures#mood' },
      { label: t.nav.measurements, icon: '•', href: '/measures' },
    ],
  },
  { label: t.nav.insights, icon: '📈', href: '/insights' },
  { label: t.nav.media, icon: '🖼️', href: '/media' },
  { label: t.nav.people, icon: '👥', href: '/people' },
  { label: t.nav.settings, icon: '⚙️', href: '/settings' },
];
