import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretLeft, CaretRight } from 'phosphor-react-native';
import { fonts, radius, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { inputBaseStyle } from './Field';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toIso(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

interface CalendarFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function CalendarField({ label, value, placeholder, onChange }: CalendarFieldProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const parsed = value ? value.split('-').map(Number) : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed ? parsed[0] : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed[1] - 1 : today.getMonth());

  const openSheet = () => {
    const p = value ? value.split('-').map(Number) : null;
    setViewYear(p ? p[0] : today.getFullYear());
    setViewMonth(p ? p[1] - 1 : today.getMonth());
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const total = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={{ gap: 5, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={inputBaseStyle(colors)} onPress={openSheet}>
        <Text style={value ? styles.valueText : styles.placeholderText}>{value || placeholder}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn}>
                <CaretLeft size={16} color={colors.text} />
              </Pressable>
              <Text style={styles.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
              <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn}>
                <CaretRight size={16} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w, i) => (
                <Text key={i} style={styles.weekday}>{w}</Text>
              ))}
            </View>
            <View style={styles.grid}>
              {cells.map((day, i) => {
                const iso = day ? toIso(viewYear, viewMonth, day) : null;
                const selected = iso !== null && iso === value;
                return (
                  <Pressable
                    key={i}
                    disabled={!day}
                    style={[styles.cell, selected && styles.cellSelected]}
                    onPress={() => {
                      if (!iso) return;
                      onChange(iso);
                      setOpen(false);
                    }}
                  >
                    {day ? <Text style={[styles.cellText, selected && styles.cellTextSelected]}>{day}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: { fontSize: 12, color: withAlpha(colors.text, 70), fontFamily: fonts.body },
    valueText: { color: colors.text, fontSize: 14, fontFamily: fonts.body },
    placeholderText: { color: withAlpha(colors.text, 35), fontSize: 14, fontFamily: fonts.body },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    sheet: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    monthLabel: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
    weekRow: { flexDirection: 'row' },
    weekday: { flex: 1, textAlign: 'center', fontSize: 11, color: withAlpha(colors.text, 45), fontFamily: fonts.body },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    cellSelected: { backgroundColor: colors.accent, borderRadius: 999 },
    cellText: { fontSize: 13.5, color: colors.text, fontFamily: fonts.body },
    cellTextSelected: { color: colors.onAccent, fontFamily: fonts.bodyMedium },
  });
}
