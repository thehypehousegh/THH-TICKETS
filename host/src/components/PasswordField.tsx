import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, type TextInputProps } from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { Field } from './Field';
import { useTheme } from '../theme/ThemeContext';

interface Props extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
}

export function PasswordField({ label, style, ...props }: Props) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Field label={label} secureTextEntry={!visible} style={[styles.input, style]} {...props} />
      <TouchableOpacity
        onPress={() => setVisible((v) => !v)}
        style={styles.toggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {visible ? <EyeSlash size={18} color={colors.text} /> : <Eye size={18} color={colors.text} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  input: { paddingRight: 40 },
  toggle: { position: 'absolute', right: 10, top: 30 },
});
