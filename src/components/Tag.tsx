import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '../theme/tokens';

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
  return (
    <View style={[styles.base, variantStyles[variant], style]}>
      <Text style={[styles.text, variant === 'outline' && { color: colors.accent }, variant === 'accent' && { color: colors.accent100 }]}>
        {children}
      </Text>
      {monoAccent}
    </View>
  );
}

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

const variantStyles = StyleSheet.create({
  neutral: { backgroundColor: colors.neutral800 },
  accent: { backgroundColor: colors.accent800 },
  outline: { borderWidth: 1, borderColor: colors.accent, backgroundColor: 'transparent' },
});
