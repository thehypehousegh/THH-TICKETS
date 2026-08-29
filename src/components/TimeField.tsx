import React, { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme/tokens';
import { Button } from './Button';
import { inputBaseStyle } from './Field';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

const ROW_HEIGHT = 40;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface TimeFieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}

export function TimeField({ label, value, placeholder, onChange }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const [hh, setHh] = useState(0);
  const [mm, setMm] = useState(0);
  const hourScroll = useRef<ScrollView | null>(null);
  const minuteScroll = useRef<ScrollView | null>(null);

  const openSheet = () => {
    const [h, m] = value ? value.split(':').map(Number) : [0, 0];
    setHh(h);
    setMm(m);
    setOpen(true);
    requestAnimationFrame(() => {
      hourScroll.current?.scrollTo({ y: h * ROW_HEIGHT, animated: false });
      minuteScroll.current?.scrollTo({ y: m * ROW_HEIGHT, animated: false });
    });
  };

  const display = value
    ? (() => {
        const [h, m] = value.split(':').map(Number);
        const h12 = ((h + 11) % 12) + 1;
        return `${h12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
      })()
    : placeholder;

  return (
    <View style={{ gap: 5, flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={inputBaseStyle} onPress={openSheet}>
        <Text style={value ? styles.valueText : styles.placeholderText}>{display}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>Time</Text>
            <View style={styles.columns}>
              <ScrollView ref={hourScroll} style={styles.col} showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <Pressable key={h} style={[styles.row, h === hh && styles.rowActive]} onPress={() => setHh(h)}>
                    <Text style={[styles.rowText, h === hh && styles.rowTextActive]}>
                      {((h + 11) % 12) + 1} {h < 12 ? 'AM' : 'PM'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView ref={minuteScroll} style={styles.col} showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <Pressable key={m} style={[styles.row, m === mm && styles.rowActive]} onPress={() => setMm(m)}>
                    <Text style={[styles.rowText, m === mm && styles.rowTextActive]}>:{pad(m)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Button
              variant="primary"
              title="Done"
              onPress={() => {
                onChange(`${pad(hh)}:${pad(mm)}`);
                setOpen(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: 'rgba(233,233,237,0.7)', fontFamily: fonts.body },
  valueText: { color: colors.text, fontSize: 14, fontFamily: fonts.body },
  placeholderText: { color: 'rgba(233,233,237,0.35)', fontSize: 14, fontFamily: fonts.body },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 300, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, gap: 12 },
  title: {
    fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: 'rgba(233,233,237,0.55)',
  },
  columns: { flexDirection: 'row', gap: 8, height: 220 },
  col: { flex: 1 },
  row: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  rowActive: { backgroundColor: 'rgba(145,132,217,0.15)' },
  rowText: { fontFamily: fonts.mono, fontSize: 15, color: colors.text },
  rowTextActive: { color: colors.accent, fontFamily: fonts.monoMedium },
});
