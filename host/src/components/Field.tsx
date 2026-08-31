import React from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { fonts, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

interface FieldProps extends TextInputProps {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Field({ label, style, containerStyle, ...inputProps }: FieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={withAlpha(colors.text, 35)}
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

// Shared by SelectField/CalendarField/TimeField, which render a Pressable
// that looks like a text input rather than using one directly.
export function inputBaseStyle(colors: ThemeColors): TextStyle {
  return {
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    fontFamily: fonts.body,
  };
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    field: { gap: 5, width: '100%' },
    label: { fontSize: 12, color: withAlpha(colors.text, 70), fontFamily: fonts.body },
    input: inputBaseStyle(colors),
  });
}
