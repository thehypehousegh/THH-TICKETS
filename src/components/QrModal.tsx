import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { DownloadSimple, ShareNetwork, X } from 'phosphor-react-native';
import { colors, fonts, radius } from '../theme/tokens';
import { Button } from './Button';
import { saveQrToPhotos, shareQrPng } from '../utils/qrExport';
import { useToast } from './Toast';
import { useData } from '../db/DataContext';
import { useScreenCaptureGuard } from '../utils/screenCaptureGuard';

interface QrModalProps {
  visible: boolean;
  code: string;
  meta: string;
  eventName: string;
  onClose: () => void;
}

export function QrModal({ visible, code, meta, eventName, onClose }: QrModalProps) {
  const svgRef = useRef<{ toDataURL: (cb: (base64: string) => void) => void } | null>(null);
  const { flash } = useToast();
  const { deviceRole } = useData();
  const isHost = deviceRole === 'host';
  const [busy, setBusy] = useState(false);

  useScreenCaptureGuard(visible && !isHost);

  const getBase64 = () =>
    new Promise<string>((resolve, reject) => {
      if (!svgRef.current) return reject(new Error('QR not ready'));
      svgRef.current.toDataURL((base64: string) => resolve(base64));
    });

  const onShare = async () => {
    setBusy(true);
    try {
      const base64 = await getBase64();
      await shareQrPng(base64, code);
    } catch {
      flash('Could not share QR code');
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    setBusy(true);
    try {
      const base64 = await getBase64();
      const saved = await saveQrToPhotos(base64, code);
      flash(saved ? 'Saved to Photos' : 'Photos permission denied');
    } catch {
      flash('Could not save QR code');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.eventName} numberOfLines={1}>{eventName}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={18} color="rgba(233,233,237,0.6)" />
            </Pressable>
          </View>
          <View style={styles.qrBox}>
            <QRCode value={code} size={200} getRef={(ref) => { svgRef.current = ref; }} />
          </View>
          <Text style={styles.code}>{code}</Text>
          <Text style={styles.meta}>{meta}</Text>
          {isHost ? (
            <View style={styles.actions}>
              <Button
                variant="primary"
                title="Save to Photos"
                onPress={onSave}
                loading={busy}
                icon={<DownloadSimple size={16} color={colors.accent} />}
                style={{ flex: 1 }}
              />
              <Button
                variant="secondary"
                iconOnly
                onPress={onShare}
                loading={busy}
                icon={<ShareNetwork size={17} color={colors.text} />}
              />
            </View>
          ) : (
            <Text style={styles.viewOnly}>View only — verifier devices can't export QR images.</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 320, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 14, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  eventName: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.6, color: colors.accent, flex: 1, textTransform: 'uppercase' },
  qrBox: { backgroundColor: '#ffffff', padding: 14, borderRadius: radius.md },
  code: { fontFamily: fonts.monoMedium, fontSize: 14, color: colors.text, textAlign: 'center' },
  meta: { fontSize: 12, color: 'rgba(233,233,237,0.6)', fontFamily: fonts.body, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, width: '100%' },
  viewOnly: { fontSize: 11.5, color: 'rgba(233,233,237,0.45)', fontFamily: fonts.body, textAlign: 'center' },
});
