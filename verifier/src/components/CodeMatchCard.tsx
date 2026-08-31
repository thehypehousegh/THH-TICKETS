import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors, radius } from '../theme/tokens';
import type { CodeMatch } from '../data/types';

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
  const { batch, code } = match;
  const used = !!code.usedAt;
  return (
    <View style={[styles.card, used && styles.cardUsed]}>
      <View style={styles.topRow}>
        <Text style={styles.code}>{code.code}</Text>
        <View style={[styles.sourceBadge, batch.source === 'online' && styles.sourceBadgePaid]}>
          <Text style={styles.sourceBadgeText}>{batch.source === 'online' ? 'Paid' : 'Self-generated'}</Text>
        </View>
      </View>
      <Text style={styles.person}>{batch.person}</Text>
      <Text style={styles.type}>{code.type}</Text>
      <Text style={used ? styles.statusUsed : styles.statusValid}>
        {used ? `Checked in ${formatTime(code.usedAt!)}` : 'Valid — not yet checked in'}
      </Text>
      {used ? (
        <Button variant="secondary" title="Undo check-in" onPress={onUndo} loading={busy} />
      ) : (
        <Button variant="primary" title="Check in" onPress={onCheckIn} loading={busy} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(145,132,217,0.45)',
  },
  cardUsed: { borderColor: 'rgba(224,176,80,0.55)' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1, borderColor: colors.accent, backgroundColor: 'transparent',
  },
  sourceBadgePaid: { borderColor: 'transparent', backgroundColor: 'rgba(145,132,217,0.35)' },
  sourceBadgeText: { fontSize: 11, color: colors.accent2 },
  code: { fontFamily: 'monospace', fontSize: 15, color: colors.text },
  person: { fontSize: 17, fontWeight: '600', color: colors.text, marginTop: 4 },
  type: { fontSize: 12.5, color: 'rgba(233,233,237,0.62)' },
  statusValid: { fontSize: 12.5, color: colors.accent, fontWeight: '600', marginBottom: 6 },
  statusUsed: { fontSize: 12.5, color: colors.warn, fontWeight: '600', marginBottom: 6 },
});
