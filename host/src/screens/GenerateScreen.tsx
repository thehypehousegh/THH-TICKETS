import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PlusCircle, X } from 'phosphor-react-native';
import type { RootScreenProps } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Field } from '../components/Field';
import { SelectField } from '../components/SelectField';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { Stepper } from '../components/Stepper';
import { useData } from '../data/DataContext';
import { codeShape } from '../utils/codes';
import { fonts, withAlpha, type ThemeColors } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import type { TicketSelection } from '../data/types';

type Props = RootScreenProps<'Generate'>;

export function GenerateScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { eventId } = route.params;
  const { getEvent, generateCodes } = useData();
  const event = getEvent(eventId);

  const [person, setPerson] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState(event?.ticketTypes[0]?.label ?? '');
  const [qty, setQty] = useState(1);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [generating, setGenerating] = useState(false);

  if (!event) {
    return (
      <Screen>
        <BackButton label="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Event not found.</Text>
      </Screen>
    );
  }

  const currentType = type || event.ticketTypes[0]?.label || '';
  const picked = event.ticketTypes.filter((t) => (qtys[t.label] || 0) > 0);
  const total = event.ticketTypes.reduce((n, t) => n + (qtys[t.label] || 0), 0);
  const invalid = !person.trim() || total === 0 || generating;

  const onAdd = () => {
    if (!currentType) return;
    setQtys((prev) => ({ ...prev, [currentType]: Math.min(40, (prev[currentType] || 0) + qty) }));
    setQty(1);
  };

  const onGenerate = async () => {
    if (invalid) return;
    setGenerating(true);
    try {
      const selections: TicketSelection[] = event.ticketTypes
        .filter((t) => (qtys[t.label] || 0) > 0)
        .map((t) => ({ typeLabel: t.label, typeCode: t.code, quantity: qtys[t.label] }));
      const batch = await generateCodes(event.id, person.trim(), contact.trim(), email.trim(), selections);
      navigation.replace('Output', { batchId: batch.id });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Screen>
      <BackButton label={event.abbr} onPress={() => navigation.goBack()} />
      <View style={{ gap: 5 }}>
        <Text style={styles.kicker}>{event.name}</Text>
        <Text style={styles.title}>Generate codes</Text>
      </View>

      <Field label="Name of person" placeholder="Dr. Harry Okyere" value={person} onChangeText={setPerson} />
      <Field label="Contact (optional)" placeholder="Phone number" value={contact} onChangeText={setContact} keyboardType="phone-pad" />
      <Field
        label="Email (optional)"
        placeholder="For sending the code/QR"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <SelectField
        label="Ticket type"
        value={currentType}
        onChange={setType}
        options={event.ticketTypes.map((t) => ({ label: `${t.label}  (${t.code})`, value: t.label }))}
      />

      <View style={{ gap: 5 }}>
        <Text style={styles.label}>Quantity</Text>
        <View style={styles.qtyRow}>
          <Stepper value={qty} onDec={() => setQty((q) => Math.max(1, q - 1))} onInc={() => setQty((q) => Math.min(20, q + 1))} min={1} max={20} />
          <Button
            variant="primary"
            title="Add to selection"
            onPress={onAdd}
            icon={<PlusCircle size={16} color={colors.accent} />}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View style={styles.selectionCard}>
        <View style={styles.selectionHeader}>
          <Text style={styles.kicker}>SELECTION</Text>
          <Text style={styles.totalLabel}>{total} {total === 1 ? 'code' : 'codes'}</Text>
        </View>
        {picked.length > 0 ? (
          <>
            <View style={{ gap: 7 }}>
              {picked.map((t) => (
                <View key={t.id} style={styles.pickedRow}>
                  <Text style={styles.pickedQty}>{qtys[t.label]}</Text>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={styles.pickedLabel}>{t.label}</Text>
                    <Text style={styles.pickedShape}>{codeShape(event, t.code)}</Text>
                  </View>
                  <Button
                    variant="ghost"
                    iconOnly
                    onPress={() => setQtys((prev) => { const n = { ...prev }; delete n[t.label]; return n; })}
                    icon={<X size={14} color={colors.accent} />}
                  />
                </View>
              ))}
            </View>
            <Button variant="ghost" title="Clear selection" onPress={() => setQtys({})} style={{ alignSelf: 'flex-start' }} />
          </>
        ) : (
          <Text style={styles.emptyHint}>
            Nothing selected yet. Pick a type, set a quantity and add it — selections hold until you press Generate.
          </Text>
        )}
      </View>

      <Button
        variant="primary"
        size="lg"
        block
        disabled={invalid}
        loading={generating}
        title={total === 0 ? 'Generate codes' : `Generate ${total} ${total === 1 ? 'code' : 'codes'}`}
        onPress={onGenerate}
      />
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontFamily: fonts.heading, fontSize: 24, color: colors.text },
    kicker: { fontFamily: fonts.headingSemibold, fontSize: 10, letterSpacing: 1.8, color: colors.accent },
    label: { fontSize: 12, color: withAlpha(colors.text, 70), fontFamily: fonts.body },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    selectionCard: { backgroundColor: colors.surface, borderRadius: 8, padding: 12, gap: 9 },
    selectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    totalLabel: { fontSize: 11, color: withAlpha(colors.text, 50), fontFamily: fonts.body },
    pickedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    pickedQty: { width: 26, fontFamily: fonts.monoMedium, fontSize: 15, color: colors.accent },
    pickedLabel: { fontFamily: fonts.heading, fontSize: 13.5, color: colors.text },
    pickedShape: { fontFamily: fonts.mono, fontSize: 10, color: withAlpha(colors.text, 45) },
    emptyHint: { fontSize: 12.5, lineHeight: 18, color: withAlpha(colors.text, 55), fontFamily: fonts.body },
  });
}
