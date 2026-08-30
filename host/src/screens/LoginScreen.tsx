import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageSquare } from 'phosphor-react-native';
import { Screen } from '../components/Screen';
import { Field } from '../components/Field';
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

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signUp') {
        await signUp(email, password, name, contact, logoUri);
      } else {
        await signIn(email, password);
      }
    } catch (e) {
      setError(readableError(e));
    } finally {
      setBusy(false);
    }
  };

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
      <Field
        label="Password"
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        variant="primary"
        size="lg"
        block
        title={mode === 'signUp' ? 'Create account' : 'Sign in'}
        onPress={onSubmit}
        loading={busy}
        disabled={invalid}
      />
      <Button
        variant="ghost"
        title={mode === 'signUp' ? 'Already have an account? Sign in' : "New organizer? Create an account"}
        onPress={() => {
          setError(null);
          setMode((m) => (m === 'signUp' ? 'signIn' : 'signUp'));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 2.2, color: colors.accent },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  error: { fontSize: 12.5, color: '#e0705a', fontFamily: fonts.body },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoPreview: { width: 44, height: 44, borderRadius: 8, backgroundColor: colors.surface },
});
