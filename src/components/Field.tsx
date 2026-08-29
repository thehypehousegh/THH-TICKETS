import React from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, fonts } from '../theme/tokens';

interface FieldProps extends TextInputProps {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Field({ label, style, containerStyle, ...inputProps }: FieldProps) {
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor="rgba(233,233,237,0.35)"
        style={[styles.input, style]}
        {...inputProps}
      />
    </View>
  );
}

export const inputBaseStyle = StyleSheet.create({
  input: {
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
  },
}).input;

const styles = StyleSheet.create({
  field: { gap: 5, width: '100%' },
  label: { fontSize: 12, color: 'rgba(233,233,237,0.7)', fontFamily: fonts.body },
  input: inputBaseStyle,
});
