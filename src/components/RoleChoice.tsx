import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { QrCode, Ticket } from 'phosphor-react-native';
import { colors, fonts, radius } from '../theme/tokens';
import type { DeviceRole } from '../db/role';

interface RoleOptionProps {
  role: DeviceRole;
  selected?: boolean;
  onPress: (role: DeviceRole) => void;
}

const COPY: Record<DeviceRole, { title: string; body: string; icon: (color: string) => React.ReactNode }> = {
  host: {
    title: 'Main host',
    body: 'Create events, generate ticket codes, scan, and produce the final PDF report.',
    icon: (color) => <Ticket size={22} color={color} />,
  },
  verifier: {
    title: 'Door verifier',
    body: 'Import an event from the host, then scan or type codes to check people in.',
    icon: (color) => <QrCode size={22} color={color} />,
  },
};

function RoleOption({ role, selected, onPress }: RoleOptionProps) {
  const c = COPY[role];
  return (
    <Pressable
      onPress={() => onPress(role)}
      style={[styles.option, selected && styles.optionSelected]}
    >
      {c.icon(selected ? colors.accent : colors.text)}
      <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{c.title}</Text>
      <Text style={styles.optionBody}>{c.body}</Text>
    </Pressable>
  );
}

export function RoleChoice({ value, onSelect }: { value?: DeviceRole | null; onSelect: (role: DeviceRole) => void }) {
  return (
    <View style={styles.row}>
      <RoleOption role="host" selected={value === 'host'} onPress={onSelect} />
      <RoleOption role="verifier" selected={value === 'verifier'} onPress={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, width: '100%' },
  option: {
    flex: 1,
    gap: 8,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: 'rgba(145,132,217,0.1)' },
  optionTitle: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  optionTitleSelected: { color: colors.accent },
  optionBody: { fontSize: 11.5, lineHeight: 16, color: 'rgba(233,233,237,0.62)', fontFamily: fonts.body },
});
