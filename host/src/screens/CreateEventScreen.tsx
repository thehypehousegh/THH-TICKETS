import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ImageSquare, MapPin, Plus, X } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Field } from '../components/Field';
import { CalendarField } from '../components/CalendarField';
import { TimeField } from '../components/TimeField';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Divider } from '../components/Divider';
import { SegmentedControl } from '../components/SegmentedControl';
import { useData } from '../data/DataContext';
import { useAuth } from '../data/AuthContext';
import { useToast } from '../components/Toast';
import { uploadImage } from '../firebase/upload';
import { abbrFromName, BRAND_PREFIX, salt as makeSalt, SALT_LENGTH } from '../utils/codes';
import { colors, fonts } from '../theme/tokens';
import type { VenuePin } from '../data/types';

type Props = RootScreenProps<'CreateEvent'>;

interface TypeDraft {
  key: number;
  label: string;
  code: string;
  price: string;
}

export function CreateEventScreen({ navigation }: Props) {
  const { createEvent } = useData();
  const { user } = useAuth();
  const { flash } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venuePin, setVenuePin] = useState<VenuePin | null>(null);
  const [locating, setLocating] = useState(false);
  const [flyerUri, setFlyerUri] = useState<string | null>(null);
  const [abbr, setAbbr] = useState('');
  const [thhFirst, setThhFirst] = useState(true);
  const [types, setTypes] = useState<TypeDraft[]>([
    { key: 0, label: 'Regular', code: 'R', price: '' },
    { key: 1, label: 'VIP', code: 'V', price: '' },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const [saving, setSaving] = useState(false);
  const previewSalt = useMemo(() => makeSalt(SALT_LENGTH), []);

  const previewAbbr = (abbr || (name ? abbrFromName(name) : 'EVT')).toUpperCase();
  const preview = thhFirst
    ? `${BRAND_PREFIX}-${previewSalt}-${previewAbbr}-R1006`
    : `${previewAbbr}-${BRAND_PREFIX}-R1006-0912`;

  const validTypes = types.filter((t) => t.label.trim());
  const invalid = !name.trim() || !date || validTypes.length === 0 || saving;

  const updateType = (key: number, patch: Partial<TypeDraft>) => {
    setTypes((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  };

  const onPickFlyer = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      flash('Photos permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      aspect: [3, 4],
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]) setFlyerUri(result.assets[0].uri);
  };

  const onUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        flash('Location permission denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setVenuePin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      flash('Venue pin set to your current location');
    } catch {
      flash('Could not get your location');
    } finally {
      setLocating(false);
    }
  };

  const onSave = async () => {
    if (invalid || !user) return;
    setSaving(true);
    try {
      let flyerUrl: string | null = null;
      if (flyerUri) {
        flyerUrl = await uploadImage(user.uid, 'flyer', flyerUri);
      }
      const event = await createEvent({
        name: name.toUpperCase(),
        description,
        date,
        time,
        venueName,
        venuePin,
        flyerUrl,
        abbr: previewAbbr,
        thhFirst,
        ticketTypes: validTypes.map((t) => ({
          label: t.label.trim(),
          code: (t.code || t.label[0]).toUpperCase(),
          price: Number(t.price) || 0,
        })),
      });
      flash(`Event created · code tag ${event.abbr}`);
      navigation.replace('EventDetail', { eventId: event.id });
    } catch {
      flash('Could not create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <BackButton label="Events" onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Create event</Text>

      <Button
        variant="secondary"
        size="lg"
        block
        title={flyerUri ? 'Change flyer' : 'Add event flyer'}
        onPress={onPickFlyer}
        icon={<ImageSquare size={17} color={colors.text} />}
      />
      {flyerUri ? <Image source={{ uri: flyerUri }} style={styles.flyerPreview} /> : null}

      <Field label="Name of event" placeholder="AROUND THE WORLD IN 80 JOKES" value={name} onChangeText={setName} />
      <Field
        label="Short description"
        placeholder="One night. Eighty jokes. Five continents."
        value={description}
        onChangeText={setDescription}
        multiline
        style={{ minHeight: 74, textAlignVertical: 'top' }}
      />
      <View style={styles.row}>
        <CalendarField label="Date" value={date} placeholder="Select date" onChange={setDate} />
        <TimeField label="Time" value={time} placeholder="Select time" onChange={setTime} />
      </View>

      <Field label="Venue" placeholder="National Theatre, Accra" value={venueName} onChangeText={setVenueName} />
      <Button
        variant="secondary"
        title={venuePin ? 'Map pin set · tap to update' : 'Use my current location as map pin'}
        onPress={onUseCurrentLocation}
        loading={locating}
        icon={<MapPin size={16} color={colors.accent} />}
      />

      <Divider />

      <View style={styles.row}>
        <Field
          label="Event abbreviation"
          placeholder="ATW"
          value={abbr}
          onChangeText={(v) => setAbbr(v.toUpperCase())}
          autoCapitalize="characters"
          style={{ fontFamily: fonts.mono, letterSpacing: 1.5, textTransform: 'uppercase' }}
          containerStyle={{ flex: 1 }}
        />
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.label}>Code order</Text>
          <SegmentedControl
            value={thhFirst ? 'thh' : 'event'}
            onChange={(v) => setThhFirst(v === 'thh')}
            options={[
              { label: 'THH first', value: 'thh' },
              { label: 'Event first', value: 'event' },
            ]}
          />
        </View>
      </View>

      <View style={styles.previewCard}>
        <Text style={styles.kicker}>CODE PREVIEW</Text>
        <Text style={styles.previewCode}>{preview}</Text>
        <Text style={styles.previewHint}>Brand · event salt · event tag · ticket letter + 4-digit</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.sectionLabel}>TICKET TYPES &amp; PRICING</Text>
        {types.map((t) => (
          <View key={t.key} style={styles.typeRow}>
            <Field
              label=""
              placeholder="Regular"
              value={t.label}
              onChangeText={(v) => updateType(t.key, { label: v })}
              containerStyle={{ flex: 2 }}
            />
            <Field
              label=""
              placeholder="R"
              value={t.code}
              onChangeText={(v) => updateType(t.key, { code: v.toUpperCase() })}
              autoCapitalize="characters"
              style={{ width: 50, textAlign: 'center', fontFamily: fonts.mono, textTransform: 'uppercase' }}
              containerStyle={{ width: 50 }}
            />
            <Field
              label=""
              placeholder="GHS"
              value={t.price}
              onChangeText={(v) => updateType(t.key, { price: v.replace(/[^0-9.]/g, '') })}
              keyboardType="decimal-pad"
              style={{ textAlign: 'center', fontFamily: fonts.mono }}
              containerStyle={{ flex: 1 }}
            />
            <Button
              variant="secondary"
              iconOnly
              onPress={() => setTypes((prev) => prev.filter((x) => x.key !== t.key))}
              icon={<X size={15} color={colors.text} />}
            />
          </View>
        ))}
        <Button
          variant="secondary"
          title="Add ticket type"
          onPress={() => {
            setTypes((prev) => [...prev, { key: nextKey, label: '', code: '', price: '' }]);
            setNextKey((k) => k + 1);
          }}
          icon={<Plus size={14} color={colors.text} />}
        />
      </View>

      <Button variant="primary" size="lg" block title="Create event" disabled={invalid} loading={saving} onPress={onSave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
  row: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 12, color: 'rgba(233,233,237,0.7)', fontFamily: fonts.body },
  flyerPreview: { width: '100%', aspectRatio: 3 / 4, borderRadius: 10, backgroundColor: colors.surface },
  previewCard: { backgroundColor: colors.surface, borderRadius: 8, padding: 12, gap: 6 },
  kicker: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: colors.accent },
  previewCode: { fontFamily: fonts.monoMedium, fontSize: 14, color: colors.text },
  previewHint: { fontSize: 11, color: 'rgba(233,233,237,0.5)', fontFamily: fonts.body },
  sectionLabel: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: 'rgba(233,233,237,0.6)' },
  typeRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});
