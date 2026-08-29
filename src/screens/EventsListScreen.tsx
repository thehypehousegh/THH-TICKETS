import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { FileArrowDown, Plus } from 'phosphor-react-native';
import type { TabScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Tag } from '../components/Tag';
import { Divider } from '../components/Divider';
import { useData } from '../db/DataContext';
import { useToast } from '../components/Toast';
import { longWhen, BRAND_PREFIX } from '../utils/codes';
import { pickAndParseEventImport } from '../utils/eventTransfer';
import { colors, fonts } from '../theme/tokens';
import type { EventRecord } from '../db/types';

type Props = TabScreenProps<'Events'>;

export function EventsListScreen({ navigation }: Props) {
  const { events, batchesForEvent, importEventData } = useData();
  const { flash } = useToast();
  const [importing, setImporting] = useState(false);

  const onImport = async () => {
    setImporting(true);
    try {
      const outcome = await pickAndParseEventImport();
      if (outcome.status === 'canceled') return;
      if (outcome.status === 'invalid') {
        flash(outcome.reason);
        return;
      }
      const eventId = await importEventData(outcome.payload);
      flash(`Imported ${outcome.payload.event.name}`);
      navigation.navigate('EventDetail', { eventId });
    } catch (e) {
      flash('Could not import that file');
    } finally {
      setImporting(false);
    }
  };

  const renderItem = ({ item }: { item: EventRecord }) => {
    const issued = batchesForEvent(item.id).reduce((n, b) => n + b.codes.length, 0);
    const sample = item.thhFirst
      ? `${BRAND_PREFIX}-${item.salt}-${item.abbr}-R####`
      : `${item.abbr}-${BRAND_PREFIX}-R####-####`;
    return (
      <Card onPress={() => navigation.navigate('EventDetail', { eventId: item.id })} style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.abbrBox}>
            <Text style={styles.abbrText}>{item.abbr}</Text>
          </View>
          <Tag variant="neutral">{issued} codes</Tag>
        </View>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.metaCol}>
          <Text style={styles.meta}>{longWhen(item)}</Text>
          <Text style={styles.meta}>{item.venue}</Text>
        </View>
        <Text style={styles.sample}>{sample}</Text>
      </Card>
    );
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>THE HYPE HOUSE</Text>
          <Text style={styles.title}>Events</Text>
        </View>
        <View style={styles.headerActions}>
          <Button
            variant="secondary"
            iconOnly
            loading={importing}
            onPress={onImport}
            icon={<FileArrowDown size={17} color={colors.text} />}
          />
          <Button
            variant="primary"
            title="New"
            onPress={() => navigation.navigate('CreateEvent')}
            icon={<Plus size={15} color={colors.accent} />}
          />
        </View>
      </View>
      <Divider />
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No events yet. Tap New to create your first one.</Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 0, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  kicker: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 2.2, color: colors.accent, marginBottom: 6 },
  title: { fontFamily: fonts.heading, fontSize: 27, color: colors.text },
  list: { gap: 10, paddingBottom: 108, paddingTop: 4 },
  card: { gap: 10, padding: 14, borderRadius: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  abbrBox: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  abbrText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1, color: colors.accent },
  name: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
  metaCol: { gap: 2 },
  meta: { fontSize: 12, color: 'rgba(233,233,237,0.52)', fontFamily: fonts.body },
  sample: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.accent2, marginTop: 2 },
  empty: { fontSize: 13, color: 'rgba(233,233,237,0.5)', fontFamily: fonts.body, paddingTop: 24, textAlign: 'center' },
});
