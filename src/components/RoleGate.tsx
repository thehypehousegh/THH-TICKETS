import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ticket } from 'phosphor-react-native';
import { RoleChoice } from './RoleChoice';
import { useData } from '../db/DataContext';
import { colors, fonts } from '../theme/tokens';
import type { DeviceRole } from '../db/role';

export function RoleGate({ children }: { children: React.ReactNode }) {
  const { deviceRole, setDeviceRole, loading } = useData();
  const [pending, setPending] = useState<DeviceRole | null>(null);

  if (loading) return null;
  if (deviceRole) return <>{children}</>;

  const onSelect = async (role: DeviceRole) => {
    setPending(role);
    await setDeviceRole(role);
  };

  return (
    <View style={styles.screen}>
      <Ticket size={40} color={colors.accent} />
      <Text style={styles.kicker}>THE HYPE HOUSE</Text>
      <Text style={styles.title}>What is this phone?</Text>
      <Text style={styles.body}>
        You can change this later. The main host creates events and codes; door verifiers
        just check people in.
      </Text>
      <RoleChoice value={pending} onSelect={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  kicker: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 2.2, color: colors.accent, marginTop: 8 },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  body: { fontSize: 13.5, lineHeight: 20, color: 'rgba(233,233,237,0.72)', fontFamily: fonts.body, textAlign: 'center', marginBottom: 8 },
});
