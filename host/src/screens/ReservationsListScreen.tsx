import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CaretRight, ShieldCheck, SignOut } from 'phosphor-react-native';
import type { TabScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { useData } from '../data/DataContext';
import { useAuth } from '../data/AuthContext';
import { fonts, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import type { BatchRecord } from '../data/types';

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
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { batches, getEvent } = useData();
  const { organizer, signOut } = useAuth();

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

      <View style={styles.footer}>
        <Pressable style={styles.accountRow} onPress={() => navigation.navigate('Profile')}>
          <View>
            <Text style={styles.accountName}>{organizer?.name ?? ''}</Text>
            <Text style={styles.accountContact}>{organizer?.contact ?? ''}</Text>
          </View>
          <CaretRight size={16} color={withAlpha(colors.text, 40)} />
        </Pressable>
        {organizer?.isAdmin ? (
          <Pressable style={styles.accountRow} onPress={() => navigation.navigate('Admin')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} color={colors.accent} />
              <Text style={styles.accountName}>Super admin</Text>
            </View>
            <CaretRight size={16} color={withAlpha(colors.text, 40)} />
          </Pressable>
        ) : null}
        <Pressable style={styles.accountRow} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
          <SignOut size={16} color={withAlpha(colors.text, 60)} />
        </Pressable>
      </View>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { padding: 20, paddingBottom: 0, gap: 14 },
    title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
    list: { paddingBottom: 168, paddingTop: 4 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    abbr: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1, color: colors.accent },
    stamp: { fontSize: 10.5, color: withAlpha(colors.text, 42), fontFamily: fonts.body },
    person: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
    summary: { fontSize: 11.5, color: withAlpha(colors.text, 52), fontFamily: fonts.body },
    firstCode: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.accent2 },
    empty: { fontSize: 13, color: withAlpha(colors.text, 50), fontFamily: fonts.body, paddingTop: 24, textAlign: 'center' },
    footer: { position: 'absolute', left: 20, right: 20, bottom: 20, gap: 2 },
    accountRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 10, paddingHorizontal: 4,
    },
    accountName: { fontSize: 13, color: colors.text, fontFamily: fonts.bodyMedium },
    accountContact: { fontSize: 11.5, color: withAlpha(colors.text, 50), fontFamily: fonts.body },
    signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    signOutText: { fontSize: 12, color: withAlpha(colors.text, 60), fontFamily: fonts.bodyMedium },
  });
}
