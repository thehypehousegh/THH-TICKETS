import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Export, FilePdf, QrCode } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { Tag } from '../components/Tag';
import { Divider } from '../components/Divider';
import { Field } from '../components/Field';
import { CodeMatchCard } from '../components/CodeMatchCard';
import { useData } from '../db/DataContext';
import { useToast } from '../components/Toast';
import { longWhen } from '../utils/codes';
import { exportEventTicketsPdf } from '../utils/pdf';
import { exportEventData } from '../utils/eventTransfer';
import { findCodeMatches } from '../utils/verify';
import { colors, fonts } from '../theme/tokens';

type Props = RootScreenProps<'EventDetail'>;

function summarize(codes: { type: string }[]) {
  const seen: Record<string, number> = {};
  codes.forEach((c) => { seen[c.type] = (seen[c.type] || 0) + 1; });
  return Object.keys(seen).map((k) => `${seen[k]} × ${k}`).join(' · ');
}

export function EventDetailScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const { getEvent, batchesForEvent, setCodeUsed } = useData();
  const { flash } = useToast();
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
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

  const onExport = async () => {
    setExporting(true);
    try {
      await exportEventTicketsPdf(event, batches);
    } catch (e) {
      flash('Could not export PDF');
    } finally {
      setExporting(false);
    }
  };

  const onShareData = async () => {
    setSharing(true);
    try {
      await exportEventData(event, batches);
    } catch (e) {
      flash('Could not share event data');
    } finally {
      setSharing(false);
    }
  };

  const matches = findCodeMatches(batches, verifyQuery).slice(0, 8);

  const onToggleCode = async (codeId: string, used: boolean) => {
    setBusyCodeId(codeId);
    try {
      await setCodeUsed(codeId, used);
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
        <Text style={styles.meta}>{event.venue}</Text>
      </View>
      {event.description ? <Text style={styles.desc}>{event.description}</Text> : null}

      <View style={styles.tagsRow}>
        {event.types.map((t) => (
          <Tag key={t.id} variant="outline">
            {t.label}  <Text style={styles.tagCode}>{t.code}</Text>
          </Tag>
        ))}
      </View>

      <Button
        variant="primary"
        size="lg"
        block
        title="Generate ticket codes"
        onPress={() => navigation.navigate('Generate', { eventId: event.id })}
      />
      <Button
        variant="secondary"
        size="lg"
        block
        title={exporting ? 'Preparing PDF…' : 'Export PDF'}
        loading={exporting}
        onPress={onExport}
        icon={<FilePdf size={17} color={colors.text} />}
      />
      <Button
        variant="secondary"
        size="lg"
        block
        title={sharing ? 'Preparing…' : 'Share event to another phone'}
        loading={sharing}
        onPress={onShareData}
        icon={<Export size={17} color={colors.text} />}
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
              <Tag variant="accent">{b.codes.length}×</Tag>
            </View>
            <Text style={styles.firstCode}>
              {b.codes[0]?.code}{b.codes.length > 1 ? `  +${b.codes.length - 1} more` : ''}
            </Text>
            <Text style={styles.summary}>{summarize(b.codes)}</Text>
          </Card>
        ))}
        {batches.length === 0 ? <Text style={styles.empty}>No codes issued yet for this event.</Text> : null}
      </View>
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
  tagCode: { fontFamily: fonts.mono, color: colors.accent },
  issuedRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionLabel: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: 'rgba(233,233,237,0.6)' },
  issuedMeta: { fontSize: 11, color: 'rgba(233,233,237,0.45)', fontFamily: fonts.body },
  batchTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  person: { fontFamily: fonts.heading, fontSize: 14, color: colors.text },
  firstCode: { fontFamily: fonts.mono, fontSize: 10.5, color: 'rgba(233,233,237,0.58)' },
  summary: { fontSize: 11, color: 'rgba(233,233,237,0.42)', fontFamily: fonts.body },
  empty: { fontSize: 12, color: 'rgba(233,233,237,0.42)', fontFamily: fonts.body },
});
