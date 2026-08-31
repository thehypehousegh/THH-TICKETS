import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, withAlpha, type ThemeColors } from '../theme/tokens';
import { useThemedStyles } from '../theme/useThemedStyles';

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.seg}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.opt,
              i > 0 && styles.optBorder,
              active && styles.optActive,
            ]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    seg: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.divider,
      borderRadius: radius.md,
      overflow: 'hidden',
      width: '100%',
    },
    opt: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optBorder: { borderLeftWidth: 1, borderLeftColor: colors.divider },
    optActive: { backgroundColor: withAlpha(colors.accent, 12) },
    text: { fontSize: 13, color: colors.text, fontFamily: fonts.body },
    textActive: { color: colors.accent, fontFamily: fonts.bodyMedium },
  });
}
