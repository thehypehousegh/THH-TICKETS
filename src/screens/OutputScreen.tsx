import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ArrowRight, ClipboardText, Copy } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Tag } from '../components/Tag';
import { Divider } from '../components/Divider';
import { useData } from '../db/DataContext';
import { useToast } from '../components/Toast';
import { reservationMessage, when } from '../utils/codes';
import { colors, fonts } from '../theme/tokens';

type Props = RootScreenProps<'Output'>;

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

export function OutputScreen({ route, navigation }: Props) {
  const { batchId } = route.params;
  const { getBatch, getEvent } = useData();
  const { flash } = useToast();
  const batch = getBatch(batchId);
  const event = batch ? getEvent(batch.eventId) : undefined;

  if (!batch || !event) {
    return (
      <Screen>
        <BackButton label="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.eventName}>Reservation not found.</Text>
      </Screen>
    );
  }

  const multi = batch.codes.length > 1;
  const text = reservationMessage(event, batch);
  const countLabel = `${batch.codes.length} ${batch.codes.length > 1 ? 'codes' : 'code'}`;
  const signoff = 'See you on ' + (multi ? when(event, false) : when(event, true) + ' sharp');

  const copy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    flash(label);
  };

  return (
    <Screen>
      <BackButton label={event.abbr} onPress={() => navigation.goBack()} />
      <View style={styles.topRow}>
        <Tag variant="accent">{countLabel}</Tag>
        <Text style={styles.stamp}>{formatStamp(batch.createdAt)}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardAccentBar} />
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.cardLabel}>{multi ? 'Ticket Reservation Codes:' : 'Ticket Reservation Code:'}</Text>
        <View style={{ gap: 9 }}>
          {batch.codes.map((c, i) => (
            <View key={c.id + i} style={styles.lineWrap}>
              <Text style={styles.code}>{c.code}</Text>
              <Text style={styles.lineMeta}>{multi ? `(${c.type})` : `${batch.person} (${c.type})`}</Text>
            </View>
          ))}
        </View>
        {multi ? (
          <Text style={styles.forLine}>
            For: <Text style={styles.forName}>{batch.person}</Text>
          </Text>
        ) : null}
        <Divider />
        <Text style={styles.signoff}>{signoff}</Text>
      </View>

      <View style={styles.actionsRow}>
        <Button
          variant="primary"
          size="lg"
          title="Copy message"
          onPress={() => copy(text, 'Reservation message copied')}
          icon={<ClipboardText size={16} color={colors.accent} />}
          style={{ flex: 1 }}
        />
        <Button
          variant="secondary"
          size="lg"
          iconOnly
          onPress={() => copy(batch.codes.map((c) => c.code).join('\n'), 'Codes copied')}
          icon={<Copy size={17} color={colors.text} />}
        />
      </View>

      <Button
        variant="ghost"
        title="Generate another"
        onPress={() => navigation.navigate('Generate', { eventId: event.id })}
        icon={<ArrowRight size={14} color={colors.accent} />}
        style={{ alignSelf: 'flex-start' }}
      />

      <View style={styles.copyPreview}>
        <Text style={styles.copyLabel}>WHAT GETS COPIED</Text>
        <Text style={styles.copyText}>{text}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stamp: { fontSize: 11, color: 'rgba(233,233,237,0.45)', fontFamily: fonts.body },
  card: {
    borderRadius: 14,
    padding: 18,
    paddingTop: 20,
    backgroundColor: colors.surface,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(145,132,217,0.45)',
    overflow: 'hidden',
  },
  cardAccentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: colors.accent },
  eventName: { fontFamily: fonts.heading, fontSize: 17, color: colors.text, textTransform: 'uppercase' },
  cardLabel: { fontSize: 12.5, color: 'rgba(233,233,237,0.62)', fontFamily: fonts.body },
  lineWrap: { gap: 2, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: 'rgba(145,132,217,0.6)' },
  code: { fontFamily: fonts.monoMedium, fontSize: 14, color: colors.text },
  lineMeta: { fontSize: 12, color: 'rgba(233,233,237,0.66)', fontFamily: fonts.body },
  forLine: { fontSize: 13, color: colors.text, fontFamily: fonts.body },
  forName: { fontFamily: fonts.bodyMedium },
  signoff: { fontSize: 12.5, lineHeight: 17, color: 'rgba(233,233,237,0.74)', fontFamily: fonts.body },
  actionsRow: { flexDirection: 'row', gap: 10 },
  copyPreview: { backgroundColor: colors.surface, borderRadius: 8, padding: 12 },
  copyLabel: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.6, color: 'rgba(233,233,237,0.55)', marginBottom: 8 },
  copyText: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 17, color: 'rgba(233,233,237,0.62)' },
});
