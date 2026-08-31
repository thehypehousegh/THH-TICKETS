// Ported from the Nocturne design system (project/_ds/.../styles.css) used by
// the Claude Design prototype in project/Ticket Codes.dc.html.
//
// `darkColors` / `lightColors` are the two selectable palettes; components
// never import either of these directly -- they read the active one via
// `useTheme()` from `./ThemeContext`. This file (and ThemeContext, which
// imports the raw palettes below) is the only place that should reference
// `darkColors`/`lightColors` by name.

export function withAlpha(hex: string, pct: number) {
  // e.g. withAlpha(colors.text, 52) ~= color-mix(in srgb, <hex> 52%, transparent)
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

  // Text/icon color to place on top of an `accent`-filled surface (e.g. a
  // primary button). Coincides with `bg` here because the dark accent is
  // light enough for the dark background color to read on top of it.
  onAccent: '#161826',

  accent100: '#f5f4ff',
  accent800: '#423a6a',

  neutral800: '#3f424d',
  neutral100: '#f3f5fe',

  danger: '#e0705a',
  warning: '#ffb347',
};

// A real light palette, not an inversion: same violet brand family as the
// dark theme, retuned so accent/text/dividers all clear WCAG AA against the
// light surfaces (verified against bg/surface, not just white).
export const lightColors = {
  bg: '#f6f3fc',
  surface: '#ffffff',
  text: '#211d34',
  accent: '#6e56cf',
  accent2: '#8347e5',
  divider: withAlpha('#211d34', 12),

  // The light accent is too dark for dark text to sit on top of it at AA
  // contrast, so (unlike dark mode) `onAccent` is a light color here.
  onAccent: '#fbfaff',

  accent100: '#fbfaff',
  accent800: '#5b3fc0',

  neutral800: '#e7e4f2',
  neutral100: '#332e4d',

  danger: '#c0392b',
  warning: '#a15c00',
};

export type ThemeColors = typeof darkColors;

export const fonts = {
  heading: 'Inter_500Medium',
  headingSemibold: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
};

export const space = {
  1: 3,
  2: 6,
  3: 8,
  4: 11,
  6: 17,
  8: 22,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
};
