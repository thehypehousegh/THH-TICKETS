// Ported from the Nocturne design system (project/_ds/.../styles.css) used by
// the Claude Design prototype in project/Ticket Codes.dc.html.

export const colors = {
  bg: '#161826',
  surface: '#232532',
  text: '#e9e9ed',
  accent: '#9184d9',
  accent2: '#a7a1db',
  divider: 'rgba(233,233,237,0.16)',

  accent100: '#f5f4ff',
  accent800: '#423a6a',

  neutral800: '#3f424d',
  neutral100: '#f3f5fe',
};

export function textAlpha(pct: number) {
  // e.g. textAlpha(52) ~= color-mix(in srgb, var(--color-text) 52%, transparent)
  const a = Math.round((pct / 100) * 255)
    .toString(16)
    .padStart(2, '0');
  return colors.text + a;
}

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
