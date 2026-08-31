import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ImageSquare } from 'phosphor-react-native';
import { Screen } from '../components/Screen';
import { Field } from '../components/Field';
import { PasswordField } from '../components/PasswordField';
import { Button } from '../components/Button';
import { useAuth } from '../data/AuthContext';
import { colors, fonts } from '../theme/tokens';

function readableError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code.includes('email-already-in-use')) return 'An account already exists with that email.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Email or password is incorrect.';
  }
  if (code.includes('weak-password')) return 'Password should be at least 6 characters.';
  if (code.includes('invalid-email')) return 'That email address looks invalid.';
  if (code.includes('network-request-failed')) return 'No internet connection.';
  return 'Something went wrong. Please try again.';
}

// Firebase Auth already throttles repeated failed sign-ins server-side --
// this is just a client-side UX layer that locks the form after a few
// failed tries with a visible countdown, so a user gets feedback well
// before hitting Firebase's own limit.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

function attemptsKey(email: string) {
  return `thh-login-attempts:${email.trim().toLowerCase()}`;
}

async function readAttempts(email: string): Promise<{ count: number; lockedUntil: number }> {
  try {
    const raw = await AsyncStorage.getItem(attemptsKey(email));
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

async function writeAttempts(email: string, data: { count: number; lockedUntil: number }) {
  try {
    await AsyncStorage.setItem(attemptsKey(email), JSON.stringify(data));
  } catch {
    // Best-effort only.
  }
}

export function LoginScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'reset'>('signIn');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const remainingSeconds = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0;
  const locked = mode === 'signIn' && remainingSeconds > 0;

  const invalid =
    !email.trim() || !password || (mode === 'signUp' && (!name.trim() || !contact.trim()));

  const onPickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      aspect: [1, 1],
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) setLogoUri(result.assets[0].uri);
  };

  const onSubmit = async () => {
    if (invalid || busy) return;
    if (mode === 'signIn') {
      const state = await readAttempts(email);
      const now = Date.now();
      if (state.lockedUntil > now) {
        setLockedUntil(state.lockedUntil);
        return;
      }
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signUp') {
        await signUp(email, password, name, contact, logoUri);
      } else {
        await signIn(email, password);
        await writeAttempts(email, { count: 0, lockedUntil: 0 });
      }
    } catch (e) {
      if (mode === 'signIn') {
        const state = await readAttempts(email);
        const nextCount = state.count + 1;
        if (nextCount >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_MS;
          await writeAttempts(email, { count: 0, lockedUntil: until });
          setLockedUntil(until);
        } else {
          await writeAttempts(email, { count: nextCount, lockedUntil: 0 });
          const left = MAX_ATTEMPTS - nextCount;
          setError(`${readableError(e)} (${left} attempt${left === 1 ? '' : 's'} left)`);
        }
      } else {
        setError(readableError(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const onSendReset = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await resetPassword(email);
    } catch {
      // Same UI regardless of the specific error, so we never reveal
      // whether an email address has an account.
    } finally {
      setResetSent(true);
      setBusy(false);
    }
  };

  if (mode === 'reset') {
    return (
      <Screen>
        <View style={{ gap: 4, marginBottom: 8 }}>
          <Text style={styles.kicker}>THE HYPE HOUSE</Text>
          <Text style={styles.title}>Reset password</Text>
        </View>
        {resetSent ? (
          <>
            <Text style={styles.error}>
              If an account exists for {email}, a password reset link has been sent.
            </Text>
            <Text style={styles.hint}>Don't see it? Check your spam/junk folder too.</Text>
          </>
        ) : (
          <>
            <Field
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button variant="primary" size="lg" block title="Send reset link" onPress={onSendReset} loading={busy} disabled={!email.trim()} />
          </>
        )}
        <Button
          variant="ghost"
          title="Back to sign in"
          onPress={() => { setMode('signIn'); setResetSent(false); setError(null); }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ gap: 4, marginBottom: 8 }}>
        <Text style={styles.kicker}>THE HYPE HOUSE</Text>
        <Text style={styles.title}>{mode === 'signUp' ? 'Create organizer account' : 'Sign in'}</Text>
      </View>

      {mode === 'signUp' ? (
        <>
          <View style={styles.logoRow}>
            {logoUri ? <Image source={{ uri: logoUri }} style={styles.logoPreview} /> : null}
            <Button
              variant="secondary"
              title={logoUri ? 'Change logo' : 'Add a logo (optional)'}
              onPress={onPickLogo}
              icon={<ImageSquare size={16} color={colors.text} />}
              style={{ flex: 1 }}
            />
          </View>
          <Field label="Organizer / brand name" placeholder="The Hype House" value={name} onChangeText={setName} />
          <Field
            label="Contact (phone or email)"
            placeholder="020 000 0000"
            value={contact}
            onChangeText={setContact}
          />
        </>
      ) : null}

      <Field
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <PasswordField label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} />

      {locked ? (
        <Text style={styles.error}>Too many failed attempts. Try again in {remainingSeconds}s.</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        block
        title={mode === 'signUp' ? 'Create account' : 'Sign in'}
        onPress={onSubmit}
        loading={busy}
        disabled={invalid || locked}
      />
      <Button
        variant="ghost"
        title={mode === 'signUp' ? 'Already have an account? Sign in' : "New organizer? Create an account"}
        onPress={() => {
          setError(null);
          setMode((m) => (m === 'signUp' ? 'signIn' : 'signUp'));
        }}
      />
      {mode === 'signIn' && (
        <Button variant="ghost" title="Forgot password?" onPress={() => { setError(null); setResetSent(false); setMode('reset'); }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 2.2, color: colors.accent },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  error: { fontSize: 12.5, color: '#e0705a', fontFamily: fonts.body },
  hint: { fontSize: 12, color: 'rgba(233,233,237,0.55)', fontFamily: fonts.body },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoPreview: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surface },
});
