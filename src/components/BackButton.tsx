import React from 'react';
import { CaretLeft } from 'phosphor-react-native';
import { Button } from './Button';
import { colors } from '../theme/tokens';

export function BackButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button
      variant="ghost"
      title={label}
      onPress={onPress}
      icon={<CaretLeft size={15} color={colors.accent} weight="regular" />}
      style={{ alignSelf: 'flex-start', paddingHorizontal: 4 }}
    />
  );
}
