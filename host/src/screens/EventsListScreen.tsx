import React from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'phosphor-react-native';
import type { TabScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Tag } from '../components/Tag';
import { Divider } from '../components/Divider';
import { VerifyEmailBanner } from '../components/VerifyEmailBanner';
import { useData } from '../data/DataContext';
import { useAuth } from '../data/AuthContext';
import { longWhen, BRAND_PREFIX } from '../utils/codes';
import { describeEventTiming } from '../utils/eventTiming';
import { fonts, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import type { EventRecord } from '../data/types';

type Props = TabScreenProps<'Events'>;

export function EventsListScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { events, batchesForEvent } = useData();
  const { organizer } = useAuth();

  const renderItem = ({ item }: { item: EventRecord }) => {
    const issued = batchesForEvent(item.id).reduce((n, b) => n + b.codes.length, 0);
    const sample = item.thhFirst
      ? `${BRAND_PREFIX}-${item.salt}-${item.abbr}-R####`
      : `${item.abbr}-${BRAND_PREFIX}-R####-####`;
    return (
      <Card onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} style={styles.card}>
        <View style={styles.cardRow}>
          {item.flyerUrl ? (
            <Image source={{ uri: item.flyerUrl }} style={styles.flyerThumb} />
          ) : (
            <View style={[styles.flyerThumb, styles.flyerThumbEmpty]}>
              <Text style={styles.abbrText}>{item.abbr}</Text>
            </View>
          )}
          <View style={styles.cardBody}>
            <View style={styles.topRow}>
              <Tag variant="outline">{describeEventTiming(item)}</Tag>
              <Tag variant="neutral">{issued} codes</Tag>
            </View>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.metaCol}>
              <Text style={styles.meta}>{longWhen(item)}</Text>
              <Text style={styles.meta}>{item.venueName}</Text>
            </View>
            <Text style={styles.sample}>{sample}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>{(organizer?.name ?? 'EVENTS').toUpperCase()}</Text>
          <Text style={styles.title}>Events</Text>
        </View>
        <Button
          variant="primary"
          title="New"
          onPress={() => navigation.navigate('CreateEvent')}
          icon={<Plus size={15} color={colors.accent} />}
        />
      </View>
      <VerifyEmailBanner />
      <Divider />
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No events yet. Tap New to create your first one.</Text>}
      />
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { padding: 20, paddingBottom: 0, gap: 14 },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    kicker: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 2.2, color: colors.accent, marginBottom: 6 },
    title: { fontFamily: fonts.heading, fontSize: 27, color: colors.text },
    list: { gap: 10, paddingBottom: 108, paddingTop: 4 },
    card: { padding: 14, borderRadius: 14 },
    cardRow: { flexDirection: 'row', gap: 12 },
    flyerThumb: { width: 60, height: 80, borderRadius: 8, backgroundColor: colors.surface },
    flyerThumbEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.accent,
    },
    cardBody: { flex: 1, gap: 8 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    abbrText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1, color: colors.accent },
    name: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
    metaCol: { gap: 2 },
    meta: { fontSize: 12, color: withAlpha(colors.text, 52), fontFamily: fonts.body },
    sample: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.accent2, marginTop: 2 },
    empty: { fontSize: 13, color: withAlpha(colors.text, 50), fontFamily: fonts.body, paddingTop: 24, textAlign: 'center' },
  });
}
