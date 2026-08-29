import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Eye, EyeSlash } from 'phosphor-react-native';
import type { TabScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { Divider } from '../components/Divider';
import { RoleChoice } from '../components/RoleChoice';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { useData } from '../db/DataContext';
import {
  buildFullBackup,
  exportFullBackup,
  pickAndParseFullBackupImport,
  saveFullBackupToDevice,
} from '../utils/eventTransfer';
import { useToast } from '../components/Toast';
import { colors, fonts, radius } from '../theme/tokens';
import type { BatchRecord } from '../db/types';
import type { DeviceRole } from '../db/role';

type Props = TabScreenProps<'Reservations'>;

function summarize(codes: { type: string }[]) {
  const seen: Record<string, number> = {};
  codes.forEach((c) => { seen[c.type] = (seen[c.type] || 0) + 1; });
  return Object.keys(seen).map((k) => `${seen[k]} × ${k}`).join(' · ');
}

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

const ROLE_LABEL: Record<DeviceRole, string> = { host: 'Main host', verifier: 'Door verifier' };

export function ReservationsListScreen({ navigation }: Props) {
  const { events, batches, batchesForEvent, getEvent, deviceRole, setDeviceRole, checkHostKey, hostMasterKey, restoreFullBackup } = useData();
  const { flash } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingHostSwitch, setPendingHostSwitch] = useState(false);
  const [hostKeyInput, setHostKeyInput] = useState('');
  const [hostKeyError, setHostKeyError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [masterKeyVisible, setMasterKeyVisible] = useState(false);
  const [masterKeyCopied, setMasterKeyCopied] = useState(false);
  const [backupSheetOpen, setBackupSheetOpen] = useState(false);
  const [backupBusy, setBackupBusy] = useState<'share' | 'save' | 'restore' | null>(null);

  const copyMasterKey = async () => {
    if (!hostMasterKey) return;
    await Clipboard.setStringAsync(hostMasterKey);
    setMasterKeyCopied(true);
    setTimeout(() => setMasterKeyCopied(false), 1500);
  };

  const onShareBackup = async () => {
    setBackupBusy('share');
    try {
      const payload = buildFullBackup(events, batchesForEvent, deviceRole, hostMasterKey);
      await exportFullBackup(payload);
    } catch {
      flash('Could not share backup');
    } finally {
      setBackupBusy(null);
    }
  };

  const onSaveBackup = async () => {
    setBackupBusy('save');
    try {
      const payload = buildFullBackup(events, batchesForEvent, deviceRole, hostMasterKey);
      const outcome = await saveFullBackupToDevice(payload);
      if (outcome === 'saved') flash('Backup saved');
      else if (outcome === 'failed') flash('Could not save backup');
    } finally {
      setBackupBusy(null);
    }
  };

  const onRestoreBackup = async () => {
    const outcome = await pickAndParseFullBackupImport();
    if (outcome.status === 'canceled') return;
    if (outcome.status === 'invalid') {
      flash(outcome.reason);
      return;
    }
    const { payload } = outcome;
    Alert.alert(
      'Restore this backup?',
      `This brings in ${payload.events.length} event${payload.events.length === 1 ? '' : 's'} from ${payload.exportedAt ? new Date(payload.exportedAt).toLocaleString() : 'the backup file'}. Existing events on this device are merged (check-ins keep whichever happened first), nothing is erased, and this device's role/recovery key will be set to match the backup.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setBackupBusy('restore');
            try {
              const count = await restoreFullBackup(payload);
              flash(`Restored ${count} event${count === 1 ? '' : 's'}`);
              setBackupSheetOpen(false);
            } catch {
              flash('Could not restore backup');
            } finally {
              setBackupBusy(null);
            }
          },
        },
      ]
    );
  };

  const closePicker = () => {
    setPickerOpen(false);
    setPendingHostSwitch(false);
    setHostKeyInput('');
    setHostKeyError(null);
  };

  const onSelectRole = async (role: DeviceRole) => {
    if (deviceRole === 'verifier' && role === 'host') {
      setPendingHostSwitch(true);
      return;
    }
    await setDeviceRole(role);
    closePicker();
  };

  const onConfirmHostKey = async () => {
    setChecking(true);
    try {
      const ok = await checkHostKey(hostKeyInput);
      if (!ok) {
        setHostKeyError("That code doesn't match any event on this device.");
        return;
      }
      await setDeviceRole('host');
      closePicker();
    } finally {
      setChecking(false);
    }
  };

  const renderItem = ({ item }: { item: BatchRecord }) => {
    const event = getEvent(item.eventId);
    return (
      <Card onPress={() => navigation.navigate('Output', { batchId: item.id })}>
        <View style={styles.topRow}>
          <Text style={styles.abbr}>{event?.abbr ?? ''}</Text>
          <Text style={styles.stamp}>{formatStamp(item.createdAt)}</Text>
        </View>
        <Text style={styles.person}>{item.person}</Text>
        <Text style={styles.summary}>{summarize(item.codes)}</Text>
        <Text style={styles.firstCode}>
          {item.codes[0]?.code}{item.codes.length > 1 ? `  +${item.codes.length - 1}` : ''}
        </Text>
      </Card>
    );
  };

  return (
    <Screen scroll={false} style={styles.screen}>
      <Text style={styles.title}>Reservations</Text>
      <Divider />
      <FlatList
        data={batches}
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={<Text style={styles.empty}>No reservations yet.</Text>}
      />
      <View style={styles.footer}>
        {deviceRole === 'host' && hostMasterKey ? (
          <View style={styles.masterKeyRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.masterKeyLabel}>This device's recovery key</Text>
              <Text style={styles.masterKeyValue}>
                {masterKeyVisible ? hostMasterKey : '•'.repeat(hostMasterKey.length)}
              </Text>
            </View>
            <Pressable onPress={() => setMasterKeyVisible((v) => !v)} hitSlop={10} style={{ padding: 4 }}>
              {masterKeyVisible ? (
                <EyeSlash size={17} color="rgba(233,233,237,0.6)" />
              ) : (
                <Eye size={17} color="rgba(233,233,237,0.6)" />
              )}
            </Pressable>
            <Pressable onPress={copyMasterKey} hitSlop={10} style={{ padding: 4 }}>
              <Text style={styles.masterKeyCopy}>{masterKeyCopied ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable style={styles.roleRow} onPress={() => setBackupSheetOpen(true)}>
          <Text style={styles.roleText}>Back up or restore all data on this device</Text>
          <Text style={styles.roleChange}>Manage</Text>
        </Pressable>

        <Pressable style={styles.roleRow} onPress={() => setPickerOpen(true)}>
          <Text style={styles.roleText}>
            Device role: <Text style={styles.roleValue}>{deviceRole ? ROLE_LABEL[deviceRole] : '—'}</Text>
          </Text>
          <Text style={styles.roleChange}>Change</Text>
        </Pressable>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={closePicker}>
        <Pressable style={styles.backdrop} onPress={closePicker}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {pendingHostSwitch ? (
              <>
                <Text style={styles.sheetTitle}>Enter a host code</Text>
                <Text style={styles.sheetBody}>
                  To stop verifier devices switching themselves to host by accident, becoming
                  host requires the code for an event this device already knows — ask whoever
                  created the event for it. Lost that code? The host's own recovery key (shown
                  on their device under Reservations) also works, for any event they created.
                </Text>
                <Field
                  label="Host code or recovery key"
                  placeholder="000000"
                  value={hostKeyInput}
                  onChangeText={(v) => { setHostKeyInput(v); setHostKeyError(null); }}
                  keyboardType="number-pad"
                  autoFocus
                  style={{ fontFamily: fonts.mono, letterSpacing: 4, textAlign: 'center', fontSize: 18 }}
                />
                {hostKeyError ? <Text style={styles.errorText}>{hostKeyError}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button variant="ghost" title="Back" onPress={() => setPendingHostSwitch(false)} style={{ flex: 1 }} />
                  <Button
                    variant="primary"
                    title="Confirm"
                    onPress={onConfirmHostKey}
                    loading={checking}
                    disabled={!hostKeyInput.trim()}
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Change device role</Text>
                <RoleChoice value={deviceRole} onSelect={onSelectRole} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={backupSheetOpen} transparent animationType="fade" onRequestClose={() => setBackupSheetOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setBackupSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Back up or restore all data</Text>
            <Text style={styles.sheetBody}>
              Uninstalling this app can wipe its data depending on your phone's settings, and
              there's no way for this app to change that OS-level prompt. This is the reliable
              alternative: save everything this device knows — every event, every code, its
              role, and its recovery key — to one file, and bring it all back later with Restore.
            </Text>
            <Button
              variant="secondary"
              size="lg"
              block
              title={backupBusy === 'share' ? 'Preparing…' : 'Share backup file'}
              loading={backupBusy === 'share'}
              disabled={!!backupBusy}
              onPress={onShareBackup}
            />
            <Button
              variant="secondary"
              size="lg"
              block
              title={backupBusy === 'save' ? 'Saving…' : 'Save backup to device'}
              loading={backupBusy === 'save'}
              disabled={!!backupBusy}
              onPress={onSaveBackup}
            />
            <Button
              variant="primary"
              size="lg"
              block
              title={backupBusy === 'restore' ? 'Restoring…' : 'Restore from a backup file'}
              loading={backupBusy === 'restore'}
              disabled={!!backupBusy}
              onPress={onRestoreBackup}
            />
            <Button variant="ghost" title="Close" onPress={() => setBackupSheetOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, paddingBottom: 0, gap: 14 },
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  list: { paddingBottom: 108, paddingTop: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  abbr: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1, color: colors.accent },
  stamp: { fontSize: 10.5, color: 'rgba(233,233,237,0.42)', fontFamily: fonts.body },
  person: { fontFamily: fonts.heading, fontSize: 15, color: colors.text },
  summary: { fontSize: 11.5, color: 'rgba(233,233,237,0.52)', fontFamily: fonts.body },
  firstCode: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.accent2 },
  empty: { fontSize: 13, color: 'rgba(233,233,237,0.5)', fontFamily: fonts.body, paddingTop: 24, textAlign: 'center' },
  footer: {
    position: 'absolute', left: 20, right: 20, bottom: 20,
    gap: 2,
  },
  roleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 4,
  },
  roleText: { fontSize: 11.5, color: 'rgba(233,233,237,0.5)', fontFamily: fonts.body },
  roleValue: { color: 'rgba(233,233,237,0.75)', fontFamily: fonts.bodyMedium },
  roleChange: { fontSize: 11.5, color: colors.accent, fontFamily: fonts.bodyMedium },
  masterKeyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 10,
    marginBottom: 4,
    backgroundColor: 'rgba(233,233,237,0.05)', borderRadius: radius.md,
  },
  masterKeyLabel: { fontSize: 10, color: 'rgba(233,233,237,0.45)', fontFamily: fonts.body },
  masterKeyValue: { fontSize: 13, color: colors.accent2, fontFamily: fonts.mono, letterSpacing: 1, marginTop: 2 },
  masterKeyCopy: { fontSize: 11.5, color: colors.accent, fontFamily: fonts.bodyMedium },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 18, gap: 14 },
  sheetTitle: { fontFamily: fonts.heading, fontSize: 17, color: colors.text },
  sheetBody: { fontSize: 12.5, lineHeight: 18, color: 'rgba(233,233,237,0.65)', fontFamily: fonts.body },
  errorText: { fontSize: 12, color: '#e0705a', fontFamily: fonts.body },
});
