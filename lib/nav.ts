export interface NavItem {
  label: string;
  icon: string;       // short emoji/glyph placeholder for v1
  href?: string;      // leaf links
  children?: NavItem[];
}

export const NAV: NavItem[] = [
  { label: 'Dashboard', icon: '🏠', href: '/' },
  { label: 'Activity', icon: '🏃', href: '/measures' }, // activity lives under measures for v1
  { label: 'Nutrition', icon: '🍽️', href: '/food' },
  {
    label: 'Body', icon: '⚖️', children: [
      { label: 'Weight', icon: '•', href: '/measures#weight' },
      { label: 'Mood', icon: '•', href: '/measures#mood' },
      { label: 'Measurements', icon: '•', href: '/measures' },
    ],
  },
  { label: 'Insights', icon: '📈', href: '/insights' },
  { label: 'Media', icon: '🖼️', href: '/media' },
  { label: 'People', icon: '👥', href: '/people' },
  { label: 'Settings', icon: '⚙️', href: '/settings' },
];
