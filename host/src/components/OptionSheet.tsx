import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'phosphor-react-native';
import { fonts, radius, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

export interface SheetOption<T extends string = string> {
  label: string;
  value: T;
}

interface OptionSheetProps<T extends string> {
  visible: boolean;
  title: string;
  options: SheetOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

export function OptionSheet<T extends string>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: OptionSheetProps<T>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            style={{ maxHeight: 340 }}
            renderItem={({ item }) => {
              const active = item.value === selectedValue;
              return (
                <Pressable
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                >
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.label}</Text>
                  {active ? <Check size={16} color={colors.accent} weight="bold" /> : null}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingTop: 14,
      paddingBottom: 28,
      paddingHorizontal: 6,
    },
    title: {
      fontFamily: fonts.headingSemibold,
      fontSize: 10,
      letterSpacing: 1.8,
      color: withAlpha(colors.text, 55),
      paddingHorizontal: 14,
      paddingBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      paddingHorizontal: 14,
      borderRadius: radius.md,
    },
    rowActive: { backgroundColor: withAlpha(colors.accent, 12) },
    rowText: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
    rowTextActive: { color: colors.accent, fontFamily: fonts.bodyMedium },
  });
}
