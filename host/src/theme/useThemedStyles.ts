import { useMemo } from 'react';
import { useTheme } from './ThemeContext';
import type { ThemeColors } from './tokens';

// Shared helper so every screen/component doesn't repeat the
// `useTheme()` + `useMemo(() => makeStyles(colors), [colors])` boilerplate.
// `factory` should be a module-level function (e.g. `makeStyles`) that
// builds a `StyleSheet.create({...})` result from the active colors.
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
