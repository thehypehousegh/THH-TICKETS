import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ImageSquare, MapPin, Plus, X } from 'phosphor-react-native';
import { Screen } from './Screen';
import { Field } from './Field';
import { CalendarField } from './CalendarField';
import { TimeField } from './TimeField';
import { Button } from './Button';
import { BackButton } from './BackButton';
import { Divider } from './Divider';
import { SegmentedControl } from './SegmentedControl';
import { useAuth } from '../data/AuthContext';
import { useToast } from './Toast';
import { uploadImage } from '../firebase/upload';
import { abbrFromName, BRAND_PREFIX, salt as makeSalt, SALT_LENGTH } from '../utils/codes';
import { colors, fonts } from '../theme/tokens';
import type { EventRecord, NewEventInput, VenuePin } from '../data/types';

interface TypeDraft {
  key: number;
  label: string;
  code: string;
  price: string;
}

interface Props {
  title: string;
  submitLabel: string;
  existingEvent?: EventRecord;
  onBack: () => void;
  onSubmit: (input: NewEventInput) => Promise<void>;
}

let nextTypeKey = 1000;

function draftsFromEvent(event?: EventRecord): TypeDraft[] {
  if (!event) {
    return [
      { key: 0, label: 'Regular', code: 'R', price: '' },
      { key: 1, label: 'VIP', code: 'V', price: '' },
    ];
  }
  return event.ticketTypes.map((t) => ({ key: nextTypeKey++, label: t.label, code: t.code, price: t.price ? String(t.price) : '' }));
}

export function EventForm({ title, submitLabel, existingEvent, onBack, onSubmit }: Props) {
  const { user } = useAuth();
  const { flash } = useToast();
  const [name, setName] = useState(existingEvent?.name ?? '');
  const [description, setDescription] = useState(existingEvent?.description ?? '');
  const [startDate, setStartDate] = useState(existingEvent?.startDate ?? '');
  const [startTime, setStartTime] = useState(existingEvent?.startTime ?? '');
  const [endDate, setEndDate] = useState(existingEvent?.endDate ?? '');
  const [endTime, setEndTime] = useState(existingEvent?.endTime ?? '');
  const [venueName, setVenueName] = useState(existingEvent?.venueName ?? '');
  const [venuePin, setVenuePin] = useState<VenuePin | null>(existingEvent?.venuePin ?? null);
  const [locating, setLocating] = useState(false);
  const [flyerUri, setFlyerUri] = useState<string | null>(existingEvent?.flyerUrl ?? null);
  const [flyerChanged, setFlyerChanged] = useState(false);
  const [abbr, setAbbr] = useState(existingEvent?.abbr ?? '');
  const [thhFirst, setThhFirst] = useState(existingEvent?.thhFirst ?? true);
  const [types, setTypes] = useState<TypeDraft[]>(() => draftsFromEvent(existingEvent));
  const [nextKey, setNextKey] = useState(1000);
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const previewSalt = useMemo(() => existingEvent?.salt ?? makeSalt(SALT_LENGTH), [existingEvent?.salt]);

  const previewAbbr = (abbr || (name ? abbrFromName(name) : 'EVT')).toUpperCase();
  const preview = thhFirst
    ? `${BRAND_PREFIX}-${previewSalt}-${previewAbbr}-R1006`
    : `${previewAbbr}-${BRAND_PREFIX}-R1006-0912`;

  const validTypes = types.filter((t) => t.label.trim());
  const invalid = !name.trim() || !startDate || !endDate || validTypes.length === 0 || saving;

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
    if (!result.canceled && result.assets?.[0]) {
      setFlyerUri(result.assets[0].uri);
      setFlyerChanged(true);
    }
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
    setDateError(null);

    const start = new Date(`${startDate}T${startTime || '00:00'}:00`);
    const end = new Date(`${endDate}T${endTime || '23:59'}:00`);
    if (end.getTime() < start.getTime()) {
      setDateError('End date/time cannot be before the start date/time.');
      return;
    }

    setSaving(true);
    try {
      let flyerUrl: string | null = existingEvent?.flyerUrl ?? null;
      if (flyerChanged && flyerUri) {
        flyerUrl = await uploadImage(user.uid, 'flyer', flyerUri);
      }
      await onSubmit({
        name: name.toUpperCase(),
        description,
        startDate,
        startTime,
        endDate,
        endTime,
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
    } catch {
      flash('Could not save event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <BackButton label="Back" onPress={onBack} />
      <Text style={styles.title}>{title}</Text>

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

      <Text style={styles.sectionLabel}>STARTS</Text>
      <View style={styles.row}>
        <CalendarField label="Date" value={startDate} placeholder="Select date" onChange={setStartDate} />
        <TimeField label="Time" value={startTime} placeholder="Select time" onChange={setStartTime} />
      </View>

      <Text style={styles.sectionLabel}>ENDS</Text>
      <View style={styles.row}>
        <CalendarField label="Date" value={endDate} placeholder="Select date" onChange={setEndDate} />
        <TimeField label="Time" value={endTime} placeholder="Select time" onChange={setEndTime} />
      </View>
      {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}

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

      <Button variant="primary" size="lg" block title={submitLabel} disabled={invalid} loading={saving} onPress={onSave} />
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
  errorText: { fontSize: 12, color: '#e0705a', fontFamily: fonts.body },
});
