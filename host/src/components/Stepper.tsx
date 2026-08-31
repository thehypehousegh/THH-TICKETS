import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'phosphor-react-native';
import { Button } from './Button';
import { fonts, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

export function Stepper({
  value,
  onDec,
  onInc,
  min = 1,
  max = 40,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
  min?: number;
  max?: number;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Button
        variant="secondary"
        iconOnly
        size="lg"
        disabled={value <= min}
        onPress={onDec}
        icon={<Minus size={17} color={colors.text} />}
      />
      <Text style={styles.value}>{value}</Text>
      <Button
        variant="secondary"
        iconOnly
        size="lg"
        disabled={value >= max}
        onPress={onInc}
        icon={<Plus size={17} color={colors.text} />}
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    value: { width: 42, textAlign: 'center', fontSize: 22, color: colors.text, fontFamily: fonts.monoMedium },
  });
}
