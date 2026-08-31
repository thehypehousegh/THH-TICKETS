import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowClockwise } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { Tag } from '../components/Tag';
import { Divider } from '../components/Divider';
import { useAuth } from '../data/AuthContext';
import { fetchAllEvents, fetchAllOrganizers, fetchEventBatchesOnce } from '../data/queries';
import { computeEventStats } from '../utils/stats';
import { describeEventTiming } from '../utils/eventTiming';
import { colors, fonts } from '../theme/tokens';
import type { EventRecord, OrganizerProfile } from '../data/types';

type Props = RootScreenProps<'Admin'>;

interface OrganizerRollup {
  organizer: OrganizerProfile;
  events: EventRecord[];
  paidRevenue: number;
  paidTickets: number;
  freeTickets: number;
}

function formatPayout(o: OrganizerProfile): string {
  if (!o.payout) return 'Not set';
  if (o.payout.method === 'momo') return `${o.payout.network} · ${o.payout.phone}`;
  return `${o.payout.bankName} · ${o.payout.accountName} · ${o.payout.accountNumber}`;
}

export function AdminScreen({ navigation }: Props) {
  const { organizer } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rollups, setRollups] = useState<OrganizerRollup[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [organizers, events] = await Promise.all([fetchAllOrganizers(), fetchAllEvents()]);
      const eventsByHost = new Map<string, EventRecord[]>();
      events.forEach((e) => {
        eventsByHost.set(e.hostUid, [...(eventsByHost.get(e.hostUid) ?? []), e]);
      });

      const next: OrganizerRollup[] = [];
      for (const org of organizers) {
        const orgEvents = eventsByHost.get(org.uid) ?? [];
        let paidRevenue = 0;
        let paidTickets = 0;
        let freeTickets = 0;
        for (const e of orgEvents) {
          const batches = await fetchEventBatchesOnce(e.id);
          const stats = computeEventStats(e, batches);
          paidTickets += stats.paidTotal;
          freeTickets += stats.freeTotal;
          stats.byType.forEach((t) => {
            const price = e.ticketTypes.find((tt) => tt.label === t.label)?.price ?? 0;
            paidRevenue += price * t.paid;
          });
        }
        next.push({ organizer: org, events: orgEvents, paidRevenue, paidTickets, freeTickets });
      }
      next.sort((a, b) => b.paidRevenue - a.paidRevenue);
      setRollups(next);
    } catch {
      setError('Could not load admin data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (organizer?.isAdmin) load(false);
  }, [organizer?.isAdmin, load]);

  if (!organizer?.isAdmin) {
    return (
      <Screen>
        <BackButton label="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Not authorized</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} style={{ padding: 20, gap: 14 }}>
      <BackButton label="Back" onPress={() => navigation.goBack()} />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Super admin</Text>
        <Button variant="secondary" iconOnly onPress={() => load(true)} loading={refreshing} icon={<ArrowClockwise size={16} color={colors.text} />} />
      </View>
      <Text style={styles.hint}>
        Every organizer and event on the platform. Revenue figures are computed from paid-ticket
        counts × ticket price, not confirmed Paystack settlements -- use them as an estimate for
        payouts, not a final reconciliation, until online payments are wired up.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.empty}>{error}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} />}
        >
          {rollups.map((r) => (
            <Card key={r.organizer.uid} style={{ gap: 8 }}>
              <View style={styles.orgTop}>
                <Text style={styles.orgName}>{r.organizer.name}</Text>
                <Tag variant="accent">GHS {r.paidRevenue.toFixed(2)}</Tag>
              </View>
              <Text style={styles.orgMeta}>{r.organizer.contact}</Text>
              <Text style={styles.orgMeta}>Payout: {formatPayout(r.organizer)}</Text>
              <Text style={styles.orgMeta}>
                {r.events.length} event{r.events.length === 1 ? '' : 's'} · {r.paidTickets} paid · {r.freeTickets} self-generated
              </Text>
              {r.events.length > 0 ? (
                <>
                  <Divider />
                  <View style={{ gap: 6 }}>
                    {r.events.map((e) => (
                      <View key={e.id} style={styles.eventRow}>
                        <Text style={styles.eventName} numberOfLines={1}>{e.name}</Text>
                        <Tag variant="outline">{describeEventTiming(e)}</Tag>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </Card>
          ))}
          {rollups.length === 0 ? <Text style={styles.empty}>No organizers yet.</Text> : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  hint: { fontSize: 12, lineHeight: 17, color: 'rgba(233,233,237,0.5)', fontFamily: fonts.body },
  orgTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orgName: { fontFamily: fonts.heading, fontSize: 16, color: colors.text },
  orgMeta: { fontSize: 12, color: 'rgba(233,233,237,0.6)', fontFamily: fonts.body },
  eventRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventName: { flex: 1, fontSize: 12.5, color: colors.text, fontFamily: fonts.bodyMedium },
  empty: { fontSize: 12, color: 'rgba(233,233,237,0.42)', fontFamily: fonts.body, textAlign: 'center', marginTop: 20 },
});
