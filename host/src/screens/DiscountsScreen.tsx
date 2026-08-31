import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Copy, Plus, Trash } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Card } from '../components/Card';
import { Field } from '../components/Field';
import { Divider } from '../components/Divider';
import { SegmentedControl } from '../components/SegmentedControl';
import { useData } from '../data/DataContext';
import { useToast } from '../components/Toast';
import { createDiscount, deleteDiscount, setDiscountActive, watchEventDiscounts } from '../data/queries';
import { fonts, radius, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import type { DiscountKind, DiscountRecord, DiscountValueType } from '../data/types';

type Props = RootScreenProps<'Discounts'>;

const KIND_OPTIONS: { label: string; value: DiscountKind }[] = [
  { label: 'Early bird', value: 'earlybird' },
  { label: 'Special sale', value: 'special' },
  { label: 'Group', value: 'group' },
  { label: 'Combo', value: 'combo' },
  { label: 'Other', value: 'other' },
];

export function DiscountsScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { eventId } = route.params;
  const { getEvent } = useData();
  const { flash } = useToast();
  const event = getEvent(eventId);
  const [discounts, setDiscounts] = useState<DiscountRecord[]>([]);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<DiscountKind>('earlybird');
  const [valueType, setValueType] = useState<DiscountValueType>('percent');
  const [value, setValue] = useState('');
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => watchEventDiscounts(eventId, setDiscounts), [eventId]);

  if (!event) {
    return (
      <Screen>
        <BackButton label="Back" onPress={() => navigation.goBack()} />
        <Text>Event not found.</Text>
      </Screen>
    );
  }

  const toggleType = (id: string) => {
    setSelectedTypeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const resetForm = () => {
    setCode('');
    setKind('earlybird');
    setValueType('percent');
    setValue('');
    setSelectedTypeIds([]);
    setCreating(false);
  };

  const onCreate = async () => {
    const numeric = Number(value);
    if (!numeric || numeric <= 0) {
      flash('Enter a discount value greater than 0');
      return;
    }
    if (valueType === 'percent' && numeric > 100) {
      flash('Percentage discount can\'t exceed 100');
      return;
    }
    setSaving(true);
    try {
      const discount = await createDiscount(eventId, {
        code,
        kind,
        valueType,
        value: numeric,
        ticketTypeIds: selectedTypeIds,
      });
      flash(`Discount ${discount.code} created`);
      resetForm();
    } catch {
      flash('Could not create discount');
    } finally {
      setSaving(false);
    }
  };

  const onCopyCode = async (c: string) => {
    await Clipboard.setStringAsync(c);
    flash('Discount code copied');
  };

  const onToggleActive = async (d: DiscountRecord) => {
    try {
      await setDiscountActive(eventId, d.id, !d.active);
    } catch {
      flash('Could not update discount');
    }
  };

  const onDelete = (d: DiscountRecord) => {
    Alert.alert('Delete this discount?', `${d.code} will stop working immediately.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDiscount(eventId, d.id);
          } catch {
            flash('Could not delete discount');
          }
        },
      },
    ]);
  };

  const describeScope = (d: DiscountRecord) => {
    if (d.ticketTypeIds.length === 0) return 'All ticket types';
    const labels = event.ticketTypes.filter((t) => d.ticketTypeIds.includes(t.id)).map((t) => t.label);
    return labels.join(', ') || 'All ticket types';
  };

  return (
    <Screen>
      <BackButton label={event.abbr} onPress={() => navigation.goBack()} />
      <View style={{ gap: 5 }}>
        <Text style={styles.kicker}>{event.name}</Text>
        <Text style={styles.title}>Discounts</Text>
      </View>
      <Text style={styles.hint}>
        Buyers enter a discount code at checkout to get a percentage or flat amount off. "Early
        bird", "group", and "combo" are just labels for your own reference — every discount here
        works the same way.
      </Text>

      {creating ? (
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>NEW DISCOUNT</Text>
          <Field
            label="Discount code (leave blank to auto-generate)"
            placeholder="EARLYBIRD10"
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            autoCapitalize="characters"
            style={{ fontFamily: fonts.mono, letterSpacing: 1 }}
          />
          <View style={{ gap: 5 }}>
            <Text style={styles.label}>Category</Text>
            <SegmentedControl value={kind} onChange={(v) => setKind(v as DiscountKind)} options={KIND_OPTIONS} />
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={styles.label}>Type</Text>
              <SegmentedControl
                value={valueType}
                onChange={(v) => setValueType(v as DiscountValueType)}
                options={[
                  { label: 'Percent', value: 'percent' },
                  { label: 'Flat GHS', value: 'flat' },
                ]}
              />
            </View>
            <Field
              label={valueType === 'percent' ? 'Percent off' : 'Amount off (GHS)'}
              placeholder={valueType === 'percent' ? '10' : '5.00'}
              value={value}
              onChangeText={(v) => setValue(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              style={{ textAlign: 'center', fontFamily: fonts.mono }}
              containerStyle={{ width: 110 }}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Applies to (leave none selected for all types)</Text>
            <View style={styles.typeChipsRow}>
              {event.ticketTypes.map((t) => {
                const active = selectedTypeIds.includes(t.id);
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => toggleType(t.id)}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                  >
                    {active ? <Check size={12} color={colors.accent} /> : null}
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="ghost" title="Cancel" onPress={resetForm} style={{ flex: 1 }} />
            <Button variant="primary" title="Create discount" onPress={onCreate} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Button variant="primary" size="lg" block title="New discount" onPress={() => setCreating(true)} icon={<Plus size={16} color={colors.accent} />} />
      )}

      <Divider />

      <View style={{ gap: 8 }}>
        <Text style={styles.sectionLabel}>{discounts.length} DISCOUNT{discounts.length === 1 ? '' : 'S'}</Text>
        {discounts.map((d) => (
          <Card key={d.id} style={{ gap: 8 }}>
            <View style={styles.discountTop}>
              <Text style={styles.discountCode}>{d.code}</Text>
              <Pressable onPress={() => onCopyCode(d.code)} hitSlop={8}>
                <Copy size={16} color={colors.accent} />
              </Pressable>
            </View>
            <Text style={styles.discountMeta}>
              {KIND_OPTIONS.find((k) => k.value === d.kind)?.label ?? d.kind} · {d.valueType === 'percent' ? `${d.value}% off` : `GHS ${d.value.toFixed(2)} off`}
            </Text>
            <Text style={styles.discountScope}>{describeScope(d)}</Text>
            <View style={styles.discountActions}>
              <Button variant="secondary" title={d.active ? 'Active — tap to pause' : 'Paused — tap to activate'} onPress={() => onToggleActive(d)} style={{ flex: 1 }} />
              <Button variant="danger" iconOnly onPress={() => onDelete(d)} icon={<Trash size={15} color={colors.danger} />} />
            </View>
          </Card>
        ))}
        {discounts.length === 0 ? <Text style={styles.empty}>No discounts yet for this event.</Text> : null}
      </View>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
    kicker: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: colors.accent },
    hint: { fontSize: 12.5, lineHeight: 18, color: withAlpha(colors.text, 55), fontFamily: fonts.body },
    formCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, gap: 10 },
    sectionLabel: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: withAlpha(colors.text, 60) },
    label: { fontSize: 12, color: withAlpha(colors.text, 70), fontFamily: fonts.body },
    row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
    typeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderWidth: 1, borderColor: colors.divider, borderRadius: radius.md,
      paddingHorizontal: 10, paddingVertical: 7,
    },
    typeChipActive: { borderColor: colors.accent, backgroundColor: withAlpha(colors.accent, 12) },
    typeChipText: { fontSize: 12, color: colors.text, fontFamily: fonts.body },
    typeChipTextActive: { color: colors.accent, fontFamily: fonts.bodyMedium },
    discountTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    discountCode: { fontFamily: fonts.monoBold, fontSize: 17, letterSpacing: 1.5, color: colors.text },
    discountMeta: { fontSize: 12.5, color: withAlpha(colors.text, 65), fontFamily: fonts.body },
    discountScope: { fontSize: 11.5, color: withAlpha(colors.text, 45), fontFamily: fonts.body },
    discountActions: { flexDirection: 'row', gap: 8 },
    empty: { fontSize: 12, color: withAlpha(colors.text, 42), fontFamily: fonts.body },
  });
}
