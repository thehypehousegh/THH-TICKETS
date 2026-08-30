import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ticket } from 'phosphor-react-native';
import { Button } from '../components/Button';
import { fetchEvent } from '../data/eventSync';
import { colors } from '../theme/tokens';
import type { EventRecord } from '../data/types';

interface Props {
  onJoined: (event: EventRecord) => void;
}

export function JoinScreen({ onJoined }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onJoin = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const outcome = await fetchEvent(code);
      if (outcome.status === 'found') {
        onJoined(outcome.event);
      } else if (outcome.status === 'not-found') {
        setError("No event matches that code. Double-check it with the host.");
      } else {
        setError('Could not reach the server — check your internet connection.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Ticket size={40} color={colors.accent} />
        <Text style={styles.kicker}>THH TICKETS · VERIFIER</Text>
        <Text style={styles.title}>Enter event code</Text>
        <Text style={styles.body}>
          Ask the event host for the event's code, then enter it below to see and check in its tickets live.
        </Text>
        <TextInput
          value={code}
          onChangeText={(v) => { setCode(v.toUpperCase()); setError(null); }}
          placeholder="XXXXXXX"
          placeholderTextColor="rgba(233,233,237,0.35)"
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Join event" onPress={onJoin} loading={busy} disabled={!code.trim()} style={{ width: '100%' }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  kicker: { fontSize: 11, letterSpacing: 2, color: colors.accent, fontWeight: '700', marginTop: 8 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  body: { fontSize: 13.5, lineHeight: 20, color: 'rgba(233,233,237,0.72)', textAlign: 'center', marginBottom: 4 },
  input: {
    width: '100%',
    minHeight: 56,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    color: colors.text,
    fontSize: 22,
    fontFamily: 'monospace',
    letterSpacing: 4,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  error: { fontSize: 12.5, color: colors.danger, textAlign: 'center' },
});
