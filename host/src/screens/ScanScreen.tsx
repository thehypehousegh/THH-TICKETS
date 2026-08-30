import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Button } from '../components/Button';
import { CodeMatchCard } from '../components/CodeMatchCard';
import { useData } from '../data/DataContext';
import { useToast } from '../components/Toast';
import { findCodeExact, type CodeMatch } from '../utils/verify';
import { colors, fonts } from '../theme/tokens';

type Props = RootScreenProps<'Scan'>;

export function ScanScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const { batchesForEvent, setCodeUsed } = useData();
  const { flash } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [match, setMatch] = useState<CodeMatch | 'not-found' | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  const handleScan = ({ data }: { data: string }) => {
    if (locked.current) return;
    locked.current = true;
    const found = findCodeExact(batchesForEvent(eventId), data);
    setMatch(found ?? 'not-found');
  };

  const reset = () => {
    locked.current = false;
    setMatch(null);
  };

  const toggle = async () => {
    if (!match || match === 'not-found') return;
    setBusy(true);
    try {
      await setCodeUsed(eventId, match.code.id, !match.code.usedAt);
      flash(match.code.usedAt ? 'Check-in undone' : 'Checked in');
      reset();
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return <View style={styles.fill} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.center, { padding: 24, gap: 14 }]}>
        <Text style={styles.permText}>Camera access is needed to scan ticket QR codes.</Text>
        <Button variant="primary" title="Grant camera access" onPress={requestPermission} />
        <Button variant="ghost" title="Cancel" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={styles.fill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={match ? undefined : handleScan}
      />
      <View style={styles.topBar}>
        <Button variant="secondary" iconOnly onPress={() => navigation.goBack()} icon={<X size={18} color={colors.text} />} />
        <Text style={styles.title}>Scan ticket</Text>
        <View style={{ width: 44 }} />
      </View>

      {!match ? (
        <View style={styles.frameWrap} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.hint}>Point the camera at a ticket QR code</Text>
        </View>
      ) : (
        <View style={styles.resultWrap}>
          {match === 'not-found' ? (
            <View style={styles.notFound}>
              <Text style={styles.notFoundText}>Code not recognized for this event.</Text>
              <Button variant="primary" title="Scan again" onPress={reset} />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <CodeMatchCard match={match} busy={busy} onCheckIn={toggle} onUndo={toggle} />
              <Button variant="ghost" title="Scan next" onPress={reset} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  permText: { color: colors.text, fontSize: 14, textAlign: 'center', fontFamily: fonts.body },
  topBar: {
    position: 'absolute', top: 50, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { color: '#fff', fontFamily: fonts.heading, fontSize: 16 },
  frameWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 16 },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  hint: { color: '#fff', fontSize: 13, fontFamily: fonts.body },
  resultWrap: { position: 'absolute', left: 16, right: 16, bottom: 40 },
  notFound: { backgroundColor: colors.surface, borderRadius: 14, padding: 18, gap: 12, alignItems: 'center' },
  notFoundText: { color: colors.text, fontSize: 14, fontFamily: fonts.body, textAlign: 'center' },
});
