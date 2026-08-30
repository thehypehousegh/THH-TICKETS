import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { QrCode } from 'phosphor-react-native';
import { Button } from '../components/Button';
import { CodeMatchCard } from '../components/CodeMatchCard';
import { ScanScreen } from './ScanScreen';
import { watchEventBatches, setCodeUsed } from '../data/eventSync';
import { findCodeMatches } from '../utils/verify';
import { colors } from '../theme/tokens';
import type { BatchRecord, CodeMatch, EventRecord } from '../data/types';

interface Props {
  event: EventRecord;
  myUid: string;
  onLeave: () => void;
}

export function VerifyScreen({ event, myUid, onLeave }: Props) {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busyCodeId, setBusyCodeId] = useState<string | null>(null);

  useEffect(() => watchEventBatches(event.id, setBatches), [event.id]);

  const allCodes = batches.flatMap((b) => b.codes);
  const checkedIn = allCodes.filter((c) => c.usedAt).length;
  const matches = findCodeMatches(batches, query).slice(0, 8);

  const onToggle = async (match: CodeMatch, used: boolean) => {
    setBusyCodeId(match.code.id);
    try {
      await setCodeUsed(event.id, match.code.id, used, myUid);
    } finally {
      setBusyCodeId(null);
    }
  };

  if (scanning) {
    return (
      <ScanScreen
        batches={batches}
        onCheckIn={(match, used) => onToggle(match, used)}
        onClose={() => setScanning(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eventName} numberOfLines={1}>{event.name}</Text>
        <Text style={styles.stats}>{checkedIn} / {allCodes.length} checked in</Text>
      </View>

      <Button title="Scan QR code" onPress={() => setScanning(true)} style={{ marginBottom: 4 }} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Or type part of a code to verify…"
        placeholderTextColor="rgba(233,233,237,0.35)"
        autoCapitalize="characters"
        style={styles.input}
      />

      {query.trim() ? (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.code.id}
          contentContainerStyle={{ gap: 8, paddingTop: 10 }}
          renderItem={({ item }) => (
            <CodeMatchCard
              match={item}
              busy={busyCodeId === item.code.id}
              onCheckIn={() => onToggle(item, true)}
              onUndo={() => onToggle(item, false)}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No codes match "{query.trim()}".</Text>}
        />
      ) : (
        <View style={styles.idleWrap}>
          <QrCode size={40} color="rgba(233,233,237,0.25)" />
          <Text style={styles.idleHint}>Scan a ticket, or type part of a code above to search.</Text>
        </View>
      )}

      <Button
        variant="ghost"
        title="Leave this event"
        onPress={onLeave}
        style={{ alignSelf: 'flex-start', marginTop: 8 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 10 },
  header: { gap: 2, marginBottom: 4 },
  eventName: { fontSize: 19, fontWeight: '700', color: colors.text, textTransform: 'uppercase' },
  stats: { fontSize: 12, color: 'rgba(233,233,237,0.55)' },
  input: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: 14,
    fontFamily: 'monospace',
    paddingHorizontal: 12,
  },
  idleWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  idleHint: { fontSize: 12.5, color: 'rgba(233,233,237,0.45)', textAlign: 'center' },
  empty: { fontSize: 12, color: 'rgba(233,233,237,0.42)', textAlign: 'center', marginTop: 12 },
});
