import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { radius, shadow, type ThemeColors } from '../theme/tokens';
import { useThemedStyles } from '../theme/useThemedStyles';

export function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useThemedStyles(makeStyles);
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.base, style]}>{children}</View>;
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      gap: 8,
      padding: 13,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      ...shadow.sm,
    },
    pressed: { opacity: 0.85 },
  });
}
