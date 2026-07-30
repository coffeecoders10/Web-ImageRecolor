export type ColorPalette = {
  id: string;
  name: string;
  description: string;
  slug: string;
  colors: string[];
};

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'neon-dusk',
    name: 'Neon Dusk',
    description: 'Violet, magenta, and electric blue tones.',
    slug: 'neon-dusk',
    colors: ['#1B1035', '#4C1D95', '#7C3AED', '#EC4899', '#22D3EE'],
  },
  {
    id: 'forest-mist',
    name: 'Forest Mist',
    description: 'Deep greens and soft natural highlights.',
    slug: 'forest-mist',
    colors: ['#0B1F17', '#14532D', '#15803D', '#86EFAC', '#ECFCCB'],
  },
  {
    id: 'sunset-heat',
    name: 'Sunset Heat',
    description: 'Warm oranges, reds, and golden highlights.',
    slug: 'sunset-heat',
    colors: ['#2A0A0A', '#7F1D1D', '#DC2626', '#F97316', '#FACC15'],
  },
  {
    id: 'ocean-glass',
    name: 'Ocean Glass',
    description: 'Cool navy, teal, and aqua colors.',
    slug: 'ocean-glass',
    colors: ['#061826', '#0F3A5B', '#0369A1', '#14B8A6', '#CCFBF1'],
  },
  {
    id: 'mono-ink',
    name: 'Mono Ink',
    description: 'A grayscale ink-inspired palette.',
    slug: 'mono-ink',
    colors: ['#030712', '#1F2937', '#4B5563', '#D1D5DB', '#F9FAFB'],
  },
];
