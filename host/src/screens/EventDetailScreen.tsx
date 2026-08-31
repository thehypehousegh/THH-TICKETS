import React, { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, FilePdf, QrCode, ShareNetwork, Trash } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { Tag } from '../components/Tag';
import { Divider } from '../components/Divider';
import { Field } from '../components/Field';
import { CodeMatchCard } from '../components/CodeMatchCard';
import { useData } from '../data/DataContext';
import { useToast } from '../components/Toast';
import { longWhen } from '../utils/codes';
import { exportEventTicketsPdf } from '../utils/pdf';
import { findCodeMatches } from '../utils/verify';
import { publicEventUrl } from '../utils/links';
import { computeEventStats } from '../utils/stats';
import { colors, fonts } from '../theme/tokens';

type Props = RootScreenProps<'EventDetail'>;

function summarize(codes: { type: string }[]) {
  const seen: Record<string, number> = {};
  codes.forEach((c) => { seen[c.type] = (seen[c.type] || 0) + 1; });
  return Object.keys(seen).map((k) => `${seen[k]} × ${k}`).join(' · ');
}

export function EventDetailScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const { getEvent, batchesForEvent, setCodeUsed, deleteEventData } = useData();
  const { flash } = useToast();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [verifyQuery, setVerifyQuery] = useState('');
  const [busyCodeId, setBusyCodeId] = useState<string | null>(null);
  const event = getEvent(eventId);

  if (!event) {
    return (
      <Screen>
        <BackButton label="Events" onPress={() => navigation.goBack()} />
        <Text style={styles.name}>Event not found.</Text>
      </Screen>
    );
  }

  const batches = batchesForEvent(event.id);
  const issued = batches.reduce((n, b) => n + b.codes.length, 0);
  const purchaseUrl = publicEventUrl(event.id);
  const stats = computeEventStats(event, batches);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportEventTicketsPdf(event, batches);
    } catch {
      flash('Could not export PDF');
    } finally {
      setExporting(false);
    }
  };

  const copyLink = async () => {
    await Clipboard.setStringAsync(purchaseUrl);
    flash('Purchase link copied');
  };

  const onShareEvent = async () => {
    const lines = [
      event.name,
      longWhen(event),
      event.venueName,
      event.description ? `\n${event.description}` : '',
      `\nGet your ticket: ${purchaseUrl}`,
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      flash('Could not open share sheet');
    }
  };

  const copyEventCode = async () => {
    await Clipboard.setStringAsync(event.id);
    flash('Event code copied');
  };

  const onDelete = () => {
    Alert.alert(
      'Delete this event?',
      `This permanently removes "${event.name}" and all ${issued} code${issued === 1 ? '' : 's'} for everyone -- including anyone with the purchase link or event code. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteEventData(event.id);
              navigation.goBack();
            } catch {
              flash('Could not delete event');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const matches = findCodeMatches(batches, verifyQuery).slice(0, 8);

  const onToggleCode = async (codeId: string, used: boolean) => {
    setBusyCodeId(codeId);
    try {
      await setCodeUsed(event.id, codeId, used);
      flash(used ? 'Checked in' : 'Check-in undone');
    } finally {
      setBusyCodeId(null);
    }
  };

  return (
    <Screen>
      <BackButton label="Events" onPress={() => navigation.goBack()} />
      <View style={styles.abbrBox}>
        <Text style={styles.abbrText}>{event.abbr}</Text>
      </View>
      <Text style={styles.name}>{event.name}</Text>
      <View style={{ gap: 3 }}>
        <Text style={styles.meta}>{longWhen(event)}</Text>
        <Text style={styles.meta}>{event.venueName}</Text>
      </View>
      {event.description ? <Text style={styles.desc}>{event.description}</Text> : null}

      <View style={styles.tagsRow}>
        {event.ticketTypes.map((t) => (
          <Tag key={t.id} variant="outline">
            {t.label}  <Text style={styles.tagCode}>{t.code}</Text>
            {t.price > 0 ? <Text style={styles.tagCode}> · GHS {t.price.toFixed(2)}</Text> : null}
          </Tag>
        ))}
      </View>

      <Button
        variant="primary"
        size="lg"
        block
        title="Share event"
        onPress={onShareEvent}
        icon={<ShareNetwork size={17} color={colors.accent} />}
      />

      <View style={styles.linkCard}>
        <Text style={styles.kicker}>ONLINE PURCHASE LINK</Text>
        <Text style={styles.linkValue}>{purchaseUrl}</Text>
        <View style={styles.actionsRow}>
          <Button variant="secondary" title="Copy link" onPress={copyLink} icon={<Copy size={15} color={colors.text} />} style={{ flex: 1 }} />
        </View>
        <Divider />
        <Text style={styles.kicker}>DOOR VERIFIER EVENT CODE</Text>
        <Text style={styles.hint}>Give this to anyone helping verify tickets — they enter it in the Verifier app, no login needed.</Text>
        <View style={styles.actionsRow}>
          <Text style={styles.eventCode}>{event.id}</Text>
          <Button variant="secondary" iconOnly onPress={copyEventCode} icon={<Copy size={15} color={colors.text} />} />
        </View>
      </View>

      <Divider />

      <View style={{ gap: 10 }}>
        <Text style={styles.sectionLabel}>EVENT DASHBOARD</Text>

        <View style={styles.statBigRow}>
          <View style={styles.statBig}>
            <Text style={styles.statBigNumber}>{stats.total}</Text>
            <Text style={styles.statBigLabel}>Total expected</Text>
          </View>
          <View style={styles.statBig}>
            <Text style={[styles.statBigNumber, { color: colors.accent }]}>{stats.verified}</Text>
            <Text style={styles.statBigLabel}>Verified</Text>
          </View>
          <View style={styles.statBig}>
            <Text style={[styles.statBigNumber, { color: 'rgba(233,233,237,0.55)' }]}>{stats.unverified}</Text>
            <Text style={styles.statBigLabel}>Unverified</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardTitle}>Paid tickets</Text>
            <Text style={styles.statCardTotal}>{stats.paidTotal}</Text>
          </View>
          {stats.byType.map((t) => (
            <View key={`paid-${t.label}`} style={styles.statTypeRow}>
              <Text style={styles.statTypeLabel}>{t.label}</Text>
              <Text style={styles.statTypeValue}>{t.paid}</Text>
            </View>
          ))}
        </View>

        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardTitle}>Self-generated tickets</Text>
            <Text style={styles.statCardTotal}>{stats.freeTotal}</Text>
          </View>
          {stats.byType.map((t) => (
            <View key={`free-${t.label}`} style={styles.statTypeRow}>
              <Text style={styles.statTypeLabel}>{t.label}</Text>
              <Text style={styles.statTypeValue}>{t.free}</Text>
            </View>
          ))}
        </View>
      </View>

      <Button
        variant="primary"
        size="lg"
        block
        title="Generate ticket codes (walk-ins / comps / guests)"
        onPress={() => navigation.navigate('Generate', { eventId: event.id })}
      />
      <Button
        variant="secondary"
        size="lg"
        block
        title={exporting ? 'Preparing PDF…' : 'Export PDF report'}
        loading={exporting}
        onPress={onExport}
        icon={<FilePdf size={17} color={colors.text} />}
      />

      <Divider />

      <View style={{ gap: 10 }}>
        <Text style={styles.sectionLabel}>VERIFY AT THE DOOR</Text>
        <Button
          variant="primary"
          size="lg"
          block
          title="Scan QR code"
          onPress={() => navigation.navigate('Scan', { eventId: event.id })}
          icon={<QrCode size={18} color={colors.accent} />}
        />
        <Field
          label=""
          placeholder="Or type part of a code to verify…"
          value={verifyQuery}
          onChangeText={setVerifyQuery}
          autoCapitalize="characters"
          style={{ fontFamily: fonts.mono }}
        />
        {verifyQuery.trim() ? (
          matches.length > 0 ? (
            <View style={{ gap: 8 }}>
              {matches.map((m) => (
                <CodeMatchCard
                  key={m.code.id}
                  match={m}
                  busy={busyCodeId === m.code.id}
                  onCheckIn={() => onToggleCode(m.code.id, true)}
                  onUndo={() => onToggleCode(m.code.id, false)}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>No codes match "{verifyQuery.trim()}".</Text>
          )
        ) : null}
      </View>

      <Divider />

      <View style={styles.issuedRow}>
        <Text style={styles.sectionLabel}>ISSUED</Text>
        <Text style={styles.issuedMeta}>{issued} codes · {batches.length} reservations</Text>
      </View>

      <View style={{ gap: 8 }}>
        {batches.map((b) => (
          <Card key={b.id} onPress={() => navigation.navigate('Output', { batchId: b.id })}>
            <View style={styles.batchTop}>
              <Text style={styles.person}>{b.person}</Text>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Tag variant={b.source === 'online' ? 'accent' : 'outline'}>
                  {b.source === 'online' ? 'Paid' : 'Self-generated'}
                </Tag>
                <Tag variant="accent">{b.codes.length}×</Tag>
              </View>
            </View>
            <Text style={styles.firstCode}>
              {b.codes[0]?.code}{b.codes.length > 1 ? `  +${b.codes.length - 1} more` : ''}
            </Text>
            <Text style={styles.summary}>{summarize(b.codes)}</Text>
          </Card>
        ))}
        {batches.length === 0 ? <Text style={styles.empty}>No codes issued yet for this event.</Text> : null}
      </View>

      <Divider />
      <Button
        variant="danger"
        title={deleting ? 'Deleting…' : 'Delete event'}
        loading={deleting}
        onPress={onDelete}
        icon={<Trash size={16} color="#e0705a" />}
        style={{ alignSelf: 'flex-start' }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  abbrBox: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  abbrText: { fontFamily: fonts.monoBold, fontSize: 11, letterSpacing: 1, color: colors.accent },
  name: { fontFamily: fonts.heading, fontSize: 25, color: colors.text },
  meta: { fontSize: 12.5, color: 'rgba(233,233,237,0.62)', fontFamily: fonts.body },
  desc: { fontSize: 12.5, lineHeight: 18, color: 'rgba(233,233,237,0.74)', fontFamily: fonts.body },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  actionsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  tagCode: { fontFamily: fonts.mono, color: colors.accent },
  linkCard: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, gap: 8 },
  statBigRow: { flexDirection: 'row', gap: 8 },
  statBig: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 12,
    alignItems: 'center', gap: 2,
  },
  statBigNumber: { fontFamily: fonts.heading, fontSize: 22, color: colors.text },
  statBigLabel: { fontSize: 10.5, color: 'rgba(233,233,237,0.5)', fontFamily: fonts.body, textAlign: 'center' },
  statCard: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, gap: 8 },
  statCardHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  statCardTitle: { fontFamily: fonts.headingSemibold, fontSize: 13, color: colors.text },
  statCardTotal: { fontFamily: fonts.monoBold, fontSize: 15, color: colors.accent },
  statTypeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statTypeLabel: { fontSize: 12.5, color: 'rgba(233,233,237,0.65)', fontFamily: fonts.body },
  statTypeValue: { fontSize: 12.5, color: colors.text, fontFamily: fonts.monoMedium },
  kicker: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: colors.accent },
  linkValue: { fontFamily: fonts.mono, fontSize: 11.5, color: 'rgba(233,233,237,0.75)' },
  hint: { fontSize: 11.5, lineHeight: 16, color: 'rgba(233,233,237,0.5)', fontFamily: fonts.body },
  eventCode: { flex: 1, fontFamily: fonts.monoBold, fontSize: 20, letterSpacing: 3, color: colors.text },
  issuedRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionLabel: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: 'rgba(233,233,237,0.6)' },
  issuedMeta: { fontSize: 11, color: 'rgba(233,233,237,0.45)', fontFamily: fonts.body },
  batchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  person: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
  firstCode: { fontFamily: fonts.mono, fontSize: 10.5, color: 'rgba(233,233,237,0.58)' },
  summary: { fontSize: 11, color: 'rgba(233,233,237,0.42)', fontFamily: fonts.body },
  empty: { fontSize: 12, color: 'rgba(233,233,237,0.42)', fontFamily: fonts.body },
});
