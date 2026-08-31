import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageSquare } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Divider } from '../components/Divider';
import { SegmentedControl } from '../components/SegmentedControl';
import { useAuth } from '../data/AuthContext';
import { useToast } from '../components/Toast';
import { uploadImage } from '../firebase/upload';
import { colors, fonts } from '../theme/tokens';
import type { PayoutDetails } from '../data/types';

type Props = RootScreenProps<'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { user, organizer, updateOrganizer } = useAuth();
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

  return (
    <Screen>
      <BackButton label="Back" onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Organizer profile</Text>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  logoPreview: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.surface },
  sectionLabel: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: 'rgba(233,233,237,0.6)' },
  hint: { fontSize: 12, lineHeight: 17, color: 'rgba(233,233,237,0.5)', fontFamily: fonts.body },
});
