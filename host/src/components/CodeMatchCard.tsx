import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Clock } from 'phosphor-react-native';
import { fonts, radius, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { Button } from './Button';
import { Tag } from './Tag';
import type { CodeMatch } from '../utils/verify';

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function CodeMatchCard({
  match,
  busy,
  onCheckIn,
  onUndo,
}: {
  match: CodeMatch;
  busy?: boolean;
  onCheckIn: () => void;
  onUndo: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { batch, code } = match;
  const used = !!code.usedAt;
  return (
    <View style={[styles.card, used && styles.cardUsed]}>
      <View style={styles.topRow}>
        <Text style={styles.code}>{code.code}</Text>
        <Tag variant={batch.source === 'online' ? 'accent' : 'outline'}>
          {batch.source === 'online' ? 'Paid' : 'Self-generated'}
        </Tag>
      </View>
      <Text style={styles.person}>{batch.person}</Text>
      <Text style={styles.type}>{code.type}</Text>
      <View style={styles.statusRow}>
        {used ? (
          <>
            <Clock size={14} color={colors.warning} weight="fill" />
            <Text style={styles.statusUsed}>Checked in {formatTime(code.usedAt!)}</Text>
          </>
        ) : (
          <>
            <CheckCircle size={14} color={colors.accent} weight="fill" />
            <Text style={styles.statusValid}>Valid — not yet checked in</Text>
          </>
        )}
      </View>
      {used ? (
        <Button variant="secondary" title="Undo check-in" onPress={onUndo} loading={busy} />
      ) : (
        <Button variant="primary" title="Check in" onPress={onCheckIn} loading={busy} />
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: 16,
      gap: 6,
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, 45),
    },
    cardUsed: { borderColor: withAlpha(colors.warning, 55) },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    code: { fontFamily: fonts.monoMedium, fontSize: 15, color: colors.text },
    person: { fontFamily: fonts.heading, fontSize: 17, color: colors.text, marginTop: 4 },
    type: { fontSize: 12.5, color: withAlpha(colors.text, 62), fontFamily: fonts.body },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, marginBottom: 6 },
    statusValid: { fontSize: 12.5, color: colors.accent, fontFamily: fonts.bodyMedium },
    statusUsed: { fontSize: 12.5, color: colors.warning, fontFamily: fonts.bodyMedium },
  });
}
