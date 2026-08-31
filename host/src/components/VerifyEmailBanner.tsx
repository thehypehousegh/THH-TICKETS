import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { useAuth } from '../data/AuthContext';
import { fonts, withAlpha, type ThemeColors } from '../theme/tokens';
import { useThemedStyles } from '../theme/useThemedStyles';

export function VerifyEmailBanner() {
  const styles = useThemedStyles(makeStyles);
  const { user, emailVerified, resendVerificationEmail, refreshEmailVerified } = useAuth();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || emailVerified) return null;

  const onResend = async () => {
    setBusy(true);
    setError(null);
    try {
      await resendVerificationEmail();
      setSent(true);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      setError(code.includes('too-many-requests') ? 'Too many attempts -- wait a few minutes.' : 'Could not send it -- try again.');
    } finally {
      setBusy(false);
    }
  };

  const onRefresh = async () => {
    setBusy(true);
    setError(null);
    try {
      await refreshEmailVerified();
    } catch {
      setError('Could not check your status -- try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>Verify your email ({user.email}) to secure your account.</Text>
      <View style={styles.actions}>
        {sent ? (
          <Text style={styles.sent}>Sent -- check inbox &amp; spam</Text>
        ) : (
          <Button variant="ghost" title="Resend email" onPress={onResend} loading={busy} />
        )}
        <Button variant="ghost" title="I've verified" onPress={onRefresh} loading={busy} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    banner: {
      backgroundColor: withAlpha(colors.warning, 15),
      borderRadius: 10,
      padding: 10,
      gap: 6,
    },
    text: { fontSize: 12, color: colors.warning, fontFamily: fonts.body },
    actions: { flexDirection: 'row', gap: 8 },
    sent: { fontSize: 12, color: colors.warning, fontFamily: fonts.bodyMedium, alignSelf: 'center' },
    error: { fontSize: 11, color: colors.danger, fontFamily: fonts.body },
  });
}
