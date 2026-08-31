// Deliberately no custom font loading here (unlike the host app) -- this app
// stays on the system font on purpose, to keep it small and simple to
// install; see README.md's "Why two apps" section.
//
// `darkColors` / `lightColors` are the two selectable palettes; components
// never import either directly -- they read the active one via `useTheme()`
// from `./ThemeContext`.

export function withAlpha(hex: string, pct: number) {
  const a = Math.round((pct / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex + a;
}

export const darkColors = {
  bg: '#161826',
  surface: '#232532',
  text: '#e9e9ed',
  accent: '#9184d9',
  accent2: '#a7a1db',
  divider: 'rgba(233,233,237,0.16)',
  danger: '#e0705a',
  warn: '#e0b050',

  // Text/icon color on top of an `accent`-filled surface (e.g. the primary
  // button's label). Coincides with `bg` because the dark accent is light
  // enough for the dark background color to read on top of it.
  onAccent: '#161826',
};

// A real light palette, not an inversion: same violet brand family as dark,
// retuned so accent/text/dividers clear WCAG AA against the light surfaces.
export const lightColors = {
  bg: '#f6f3fc',
  surface: '#ffffff',
  text: '#211d34',
  accent: '#6e56cf',
  accent2: '#8347e5',
  divider: withAlpha('#211d34', 12),
  danger: '#c0392b',
  warn: '#a15c00',

  // The light accent is too dark for dark text to sit on top of it at AA
  // contrast, so (unlike dark mode) `onAccent` is a light color here.
  onAccent: '#fbfaff',
};

export type ThemeColors = typeof darkColors;

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
};
