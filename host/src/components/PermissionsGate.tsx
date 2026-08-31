import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { PermissionStatus } from 'expo-modules-core';
import { QrCode } from 'phosphor-react-native';
import { Button } from './Button';
import { fonts, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

/**
 * Android/iOS only support requesting dangerous permissions (camera, photos) at
 * runtime, never at install time. Shown once, the first time both permissions
 * are still undetermined; every later launch skips straight past it.
 */
export function PermissionsGate({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [cameraPerm, requestCamera] = useCameraPermissions();
  const [mediaStatus, setMediaStatus] = useState<PermissionStatus | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    MediaLibrary.getPermissionsAsync().then((r) => setMediaStatus(r.status));
  }, []);

  if (!cameraPerm || mediaStatus === null) return null;

  const needsGate = cameraPerm.status === PermissionStatus.UNDETERMINED || mediaStatus === PermissionStatus.UNDETERMINED;
  if (!needsGate) return <>{children}</>;

  const onContinue = async () => {
    setRequesting(true);
    try {
      if (cameraPerm.status === PermissionStatus.UNDETERMINED) await requestCamera();
      if (mediaStatus === PermissionStatus.UNDETERMINED) {
        const r = await MediaLibrary.requestPermissionsAsync();
        setMediaStatus(r.status);
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <QrCode size={40} color={colors.accent} />
      <Text style={styles.kicker}>THE HYPE HOUSE</Text>
      <Text style={styles.title}>Before you start</Text>
      <Text style={styles.body}>
        THH Ticket Codes can use your camera to scan ticket QR codes at the door, and can
        save or share generated QR codes through your photos.
      </Text>
      <Button variant="primary" size="lg" block title="Continue" loading={requesting} onPress={onContinue} />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
    kicker: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 2.2, color: colors.accent, marginTop: 8 },
    title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
    body: { fontSize: 13.5, lineHeight: 20, color: withAlpha(colors.text, 72), fontFamily: fonts.body, textAlign: 'center', marginBottom: 8 },
  });
}
