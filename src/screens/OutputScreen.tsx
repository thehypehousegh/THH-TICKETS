import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { ArrowRight, ClipboardText, Copy, DownloadSimple, QrCode as QrCodeIcon, ShareNetwork } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Tag } from '../components/Tag';
import { Divider } from '../components/Divider';
import { QrModal } from '../components/QrModal';
import { useData } from '../db/DataContext';
import { useToast } from '../components/Toast';
import { reservationMessage, when } from '../utils/codes';
import { saveQrToPhotos, shareAllQrAsZip } from '../utils/qrExport';
import { useScreenCaptureGuard } from '../utils/screenCaptureGuard';
import { colors, fonts } from '../theme/tokens';

type QrRef = { toDataURL: (cb: (base64: string) => void) => void };

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
  const { getBatch, getEvent, deviceRole } = useData();
  const isHost = deviceRole === 'host';
  const { flash } = useToast();
  const batch = getBatch(batchId);
  const event = batch ? getEvent(batch.eventId) : undefined;
  const [qrCodeId, setQrCodeId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [sharingAll, setSharingAll] = useState(false);
  const qrRefs = useRef<Record<string, QrRef>>({});

  useScreenCaptureGuard(!isHost);

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

  const collectAllQrBase64 = async () => {
    const out: { code: string; base64: string }[] = [];
    for (const c of batch.codes) {
      const ref = qrRefs.current[c.id];
      if (!ref) continue;
      const base64 = await new Promise<string>((resolve) => ref.toDataURL((b64) => resolve(b64)));
      out.push({ code: c.code, base64 });
    }
    return out;
  };

  const saveAllQr = async () => {
    setSavingAll(true);
    try {
      const rendered = await collectAllQrBase64();
      let saved = 0;
      for (const r of rendered) {
        if (await saveQrToPhotos(r.base64, r.code)) saved++;
      }
      flash(saved > 0 ? `Saved ${saved} of ${batch.codes.length} QR codes to Photos` : 'Photos permission denied');
    } finally {
      setSavingAll(false);
    }
  };

  const shareAllQr = async () => {
    setSharingAll(true);
    try {
      const rendered = await collectAllQrBase64();
      await shareAllQrAsZip(rendered, `${event.abbr}-${batch.person}-qr-codes`);
    } catch {
      flash('Could not share QR codes');
    } finally {
      setSharingAll(false);
    }
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
            <View key={c.id + i} style={styles.lineRow}>
              <View style={styles.lineWrap}>
                <Text style={styles.code}>{c.code}</Text>
                <Text style={styles.lineMeta}>
                  {multi ? `(${c.type})` : `${batch.person} (${c.type})`}
                  {c.usedAt ? '  ·  checked in' : ''}
                </Text>
              </View>
              <Pressable style={styles.qrBtn} onPress={() => setQrCodeId(c.id)} hitSlop={8}>
                <QrCodeIcon size={20} color={colors.accent} />
              </Pressable>
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

      {multi && isHost ? (
        <View style={styles.actionsRow}>
          <Button
            variant="secondary"
            size="lg"
            title={savingAll ? 'Saving…' : `Save all ${batch.codes.length} QR codes to Photos`}
            loading={savingAll}
            onPress={saveAllQr}
            icon={<DownloadSimple size={17} color={colors.text} />}
            style={{ flex: 1 }}
          />
          <Button
            variant="secondary"
            size="lg"
            iconOnly
            loading={sharingAll}
            onPress={shareAllQr}
            icon={<ShareNetwork size={17} color={colors.text} />}
          />
        </View>
      ) : null}

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

      {multi && isHost ? (
        <View style={styles.hiddenQrLayer} pointerEvents="none">
          {batch.codes.map((c) => (
            <QRCode
              key={c.id}
              value={c.code}
              size={200}
              getRef={(ref) => { qrRefs.current[c.id] = ref; }}
            />
          ))}
        </View>
      ) : null}

      {(() => {
        const qrLine = batch.codes.find((c) => c.id === qrCodeId);
        if (!qrLine) return null;
        return (
          <QrModal
            visible
            code={qrLine.code}
            meta={`${qrLine.type} · ${batch.person}`}
            eventName={event.name}
            onClose={() => setQrCodeId(null)}
          />
        );
      })()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hiddenQrLayer: { position: 'absolute', top: -10000, left: -10000 },
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
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineWrap: { flex: 1, gap: 2, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: 'rgba(145,132,217,0.6)' },
  qrBtn: { padding: 4 },
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
