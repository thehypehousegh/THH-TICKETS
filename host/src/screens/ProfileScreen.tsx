import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageSquare } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Field } from '../components/Field';
import { PasswordField } from '../components/PasswordField';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Divider } from '../components/Divider';
import { SegmentedControl } from '../components/SegmentedControl';
import { useAuth } from '../data/AuthContext';
import { useToast } from '../components/Toast';
import { uploadImage } from '../firebase/upload';
import { fonts, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import type { PayoutDetails } from '../data/types';

type Props = RootScreenProps<'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { colors, theme, setTheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user, organizer, updateOrganizer, deleteAccount } = useAuth();
  const { flash } = useToast();
  const [name, setName] = useState(organizer?.name ?? '');
  const [contact, setContact] = useState(organizer?.contact ?? '');
  const [logoUri, setLogoUri] = useState<string | null>(organizer?.logoUrl ?? null);
  const [logoChanged, setLogoChanged] = useState(false);
  const [method, setMethod] = useState<'momo' | 'bank'>(organizer?.payout?.method ?? 'momo');
  const [network, setNetwork] = useState(organizer?.payout?.network ?? '');
  const [phone, setPhone] = useState(organizer?.payout?.phone ?? '');
  const [bankName, setBankName] = useState(organizer?.payout?.bankName ?? '');
  const [accountName, setAccountName] = useState(organizer?.payout?.accountName ?? '');
  const [accountNumber, setAccountNumber] = useState(organizer?.payout?.accountNumber ?? '');
  const [saving, setSaving] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const onPickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      aspect: [1, 1],
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setLogoUri(result.assets[0].uri);
      setLogoChanged(true);
    }
  };

  const payoutValid =
    method === 'momo' ? !!network.trim() && !!phone.trim() : !!bankName.trim() && !!accountName.trim() && !!accountNumber.trim();

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const logoUrl = logoChanged && logoUri ? await uploadImage(user.uid, 'logo', logoUri) : organizer?.logoUrl ?? null;
      const payout: PayoutDetails | null = payoutValid
        ? { method, network: network.trim(), phone: phone.trim(), bankName: bankName.trim(), accountName: accountName.trim(), accountNumber: accountNumber.trim() }
        : null;
      await updateOrganizer({ name: name.trim(), contact: contact.trim(), logoUrl, payout });
      flash('Profile saved');
      navigation.goBack();
    } catch {
      flash('Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your account, every event you\'ve created, your support conversations, and your uploaded images -- for everyone, including anyone holding a purchase link or event code. This can\'t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount(deletePassword);
            } catch (err) {
              const code = (err as { code?: string })?.code ?? '';
              flash(code.includes('wrong-password') || code.includes('invalid-credential') ? 'That password is incorrect' : 'Could not delete your account');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <BackButton label="Back" onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Organizer profile</Text>

      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <SegmentedControl
        value={theme}
        onChange={(v) => setTheme(v as 'dark' | 'light')}
        options={[
          { label: 'Dark', value: 'dark' },
          { label: 'Light', value: 'light' },
        ]}
      />

      <Divider />

      <Button
        variant="secondary"
        size="lg"
        block
        title={logoUri ? 'Change logo' : 'Add a logo'}
        onPress={onPickLogo}
        icon={<ImageSquare size={17} color={colors.text} />}
      />
      {logoUri ? <Image source={{ uri: logoUri }} style={styles.logoPreview} /> : null}

      <Field label="Organizer / brand name" value={name} onChangeText={setName} />
      <Field label="Contact (phone or email)" value={contact} onChangeText={setContact} />

      <Divider />

      <Text style={styles.sectionLabel}>PAYOUT METHOD</Text>
      <Text style={styles.hint}>
        Where proceeds from paid ticket sales get sent. Only visible to you and the platform admin.
      </Text>
      <SegmentedControl
        value={method}
        onChange={(v) => setMethod(v as 'momo' | 'bank')}
        options={[
          { label: 'Mobile Money', value: 'momo' },
          { label: 'Bank', value: 'bank' },
        ]}
      />

      {method === 'momo' ? (
        <>
          <Field label="Network" placeholder="MTN / Vodafone / AirtelTigo" value={network} onChangeText={setNetwork} />
          <Field label="Mobile Money number" placeholder="020 000 0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </>
      ) : (
        <>
          <Field label="Bank name" value={bankName} onChangeText={setBankName} />
          <Field label="Account name" value={accountName} onChangeText={setAccountName} />
          <Field label="Account number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
        </>
      )}

      <Button variant="primary" size="lg" block title="Save profile" onPress={onSave} loading={saving} disabled={!name.trim()} />

      <Divider />

      <Text style={[styles.sectionLabel, { color: colors.danger }]}>DANGER ZONE</Text>
      <Text style={styles.hint}>
        Permanently deletes your account, every event you've created, your support conversations, and your
        uploaded images. This can't be undone.
      </Text>
      {confirmingDelete ? (
        <>
          <PasswordField label="Confirm your password to continue" value={deletePassword} onChangeText={setDeletePassword} />
          <View style={styles.deleteRow}>
            <Button
              variant="danger"
              title={deleting ? 'Deleting…' : 'Permanently delete my account'}
              onPress={onConfirmDelete}
              loading={deleting}
              disabled={!deletePassword}
              style={{ flex: 1 }}
            />
            <Button variant="secondary" title="Cancel" onPress={() => { setConfirmingDelete(false); setDeletePassword(''); }} />
          </View>
        </>
      ) : (
        <Button variant="danger" title="Delete my account" onPress={() => setConfirmingDelete(true)} />
      )}
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
    logoPreview: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.surface },
    sectionLabel: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: withAlpha(colors.text, 60) },
    hint: { fontSize: 12, lineHeight: 17, color: withAlpha(colors.text, 50), fontFamily: fonts.body },
    deleteRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  });
}
