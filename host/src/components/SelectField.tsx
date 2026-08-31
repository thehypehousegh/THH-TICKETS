import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretDown } from 'phosphor-react-native';
import { fonts, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { inputBaseStyle } from './Field';
import { OptionSheet, type SheetOption } from './OptionSheet';

interface SelectFieldProps<T extends string> {
  label?: string;
  value: T;
  options: SheetOption<T>[];
  onChange: (value: T) => void;
  sheetTitle?: string;
}

export function SelectField<T extends string>({ label, value, options, onChange, sheetTitle }: SelectFieldProps<T>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={{ gap: 5 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable style={[inputBaseStyle(colors), styles.field]} onPress={() => setOpen(true)}>
        <Text style={styles.valueText} numberOfLines={1}>{current?.label ?? 'Select…'}</Text>
        <CaretDown size={14} color={withAlpha(colors.text, 60)} />
      </Pressable>
      <OptionSheet
        visible={open}
        title={sheetTitle ?? label ?? 'Select'}
        options={options}
        selectedValue={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: { fontSize: 12, color: withAlpha(colors.text, 70), fontFamily: fonts.body },
    field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    valueText: { color: colors.text, fontSize: 14, fontFamily: fonts.body, flex: 1 },
  });
}
