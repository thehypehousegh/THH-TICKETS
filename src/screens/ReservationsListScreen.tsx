import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { TabScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { useData } from '../db/DataContext';
import { colors, fonts } from '../theme/tokens';
import type { BatchRecord } from '../db/types';

type Props = TabScreenProps<'Reservations'>;

function summarize(codes: { type: string }[]) {
  const seen: Record<string, number> = {};
  codes.forEach((c) => { seen[c.type] = (seen[c.type] || 0) + 1; });
  return Object.keys(seen).map((k) => `${seen[k]} × ${k}`).join(' · ');
}

function formatStamp(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) + `, ${time}`;
}

export function ReservationsListScreen({ navigation }: Props) {
  const { batches, getEvent } = useData();

  const renderItem = ({ item }: { item: BatchRecord }) => {
    const event = getEvent(item.eventId);
    return (
      <Card onPress={() => navigation.navigate('Output', { batchId: item.id })}>
        <View style={styles.topRow}>
          <Text style={styles.abbr}>{event?.abbr ?? ''}</Text>
          <Text style={styles.stamp}>{formatStamp(item.createdAt)}</Text>
        </View>
        <Text style={styles.person}>{item.person}</Text>
        <Text style={styles.summary}>{summarize(item.codes)}</Text>
        <Text style={styles.firstCode}>
          {item.codes[0]?.code}{item.codes.length > 1 ? `  +${item.codes.length - 1}` : ''}
        </Text>
      </Card>
    );
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <Text style={styles.title}>Reservations</Text>
      <Divider />
      <FlatList
        data={batches}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text style={styles.empty}>No reservations yet.</Text>}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 0, gap: 14 },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  list: { paddingBottom: 108, paddingTop: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  abbr: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1, color: colors.accent },
  stamp: { fontSize: 10.5, color: 'rgba(233,233,237,0.42)', fontFamily: fonts.body },
  person: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  summary: { fontSize: 11.5, color: 'rgba(233,233,237,0.52)', fontFamily: fonts.body },
  firstCode: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.accent2 },
  empty: { fontSize: 13, color: 'rgba(233,233,237,0.5)', fontFamily: fonts.body, paddingTop: 24, textAlign: 'center' },
});
