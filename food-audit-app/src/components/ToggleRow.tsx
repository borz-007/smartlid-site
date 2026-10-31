import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({ label, hint, value, onValueChange, disabled }: Props) {
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.primary, false: '#C9CED6' }}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  disabled: { opacity: 0.5 },
  texts: { flex: 1, paddingRight: 12 },
  label: { fontSize: 16, color: colors.text, fontWeight: '500' },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
