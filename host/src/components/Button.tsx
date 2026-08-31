import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { fonts, radius, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  icon?: React.ReactNode;
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'lg';
}

export function Button({
  title,
  onPress,
  variant = 'secondary',
  disabled,
  loading,
  block,
  icon,
  iconOnly,
  style,
  size = 'md',
}: ButtonProps) {
  const { colors } = useTheme();
  const { styles, variantStyles, variantTextStyles } = useThemedStyles(makeStyles);
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        size === 'lg' && styles.lg,
        block && styles.block,
        iconOnly && (size === 'lg' ? styles.iconOnlyLg : styles.iconOnly),
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'secondary' ? colors.text : variant === 'danger' ? colors.danger : colors.accent} />
      ) : (
        <View style={styles.content}>
          {icon}
          {title ? <Text style={[styles.label, variantTextStyles[variant]]}>{title}</Text> : null}
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  const styles = StyleSheet.create({
    base: {
      minHeight: 44,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    lg: { minHeight: 48 },
    block: { width: '100%' },
    iconOnly: { width: 44, paddingHorizontal: 0, flexGrow: 0 },
    iconOnlyLg: { width: 48, paddingHorizontal: 0, flexGrow: 0 },
    content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    label: { fontFamily: fonts.heading, fontSize: 14 },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.45 },
  });

  const variantStyles: Record<ButtonVariant, ViewStyle> = StyleSheet.create({
    primary: { borderColor: colors.accent, backgroundColor: 'transparent' },
    secondary: { borderColor: colors.divider, backgroundColor: 'transparent' },
    ghost: { borderColor: 'transparent', backgroundColor: 'transparent' },
    danger: { borderColor: colors.danger, backgroundColor: 'transparent' },
  });

  const variantTextStyles: Record<ButtonVariant, TextStyle> = StyleSheet.create({
    primary: { color: colors.accent },
    secondary: { color: colors.text },
    ghost: { color: colors.accent },
    danger: { color: colors.danger },
  });

  return { styles, variantStyles, variantTextStyles };
}
