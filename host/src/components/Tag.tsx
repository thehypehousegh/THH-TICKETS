import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, type ThemeColors } from '../theme/tokens';
import { useThemedStyles } from '../theme/useThemedStyles';

type TagVariant = 'neutral' | 'accent' | 'outline';

export function Tag({
  children,
  variant = 'neutral',
  style,
  monoAccent,
}: {
  children: React.ReactNode;
  variant?: TagVariant;
  style?: StyleProp<ViewStyle>;
  monoAccent?: React.ReactNode;
}) {
  const { styles, variantBg, variantText } = useThemedStyles(makeStyles);
  return (
    <View style={[styles.base, variantBg[variant], style]}>
      <Text style={[styles.text, variantText[variant]]}>{children}</Text>
      {monoAccent}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  const styles = StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    text: { fontSize: 11, color: colors.neutral100, fontFamily: fonts.body },
  });

  const variantBg: Record<TagVariant, ViewStyle> = {
    neutral: { backgroundColor: colors.neutral800 },
    accent: { backgroundColor: colors.accent800 },
    outline: { borderWidth: 1, borderColor: colors.accent, backgroundColor: 'transparent' },
  };

  const variantText: Record<TagVariant, ViewStyle | undefined> = {
    neutral: undefined,
    accent: { color: colors.accent100 } as ViewStyle,
    outline: { color: colors.accent } as ViewStyle,
  };

  return { styles, variantBg, variantText };
}
