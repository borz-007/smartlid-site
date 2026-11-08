import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors as fallback } from '../constants/theme';

interface Props {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  colors?: { text: string; textMuted: string; border: string; primary: string };
}

export function ToggleRow({ label, hint, value, onValueChange, disabled, colors }: Props) {
  const c = colors ?? fallback;
  return (
    <View style={[styles.row, disabled && styles.disabled, { borderBottomColor: c.border }]}>
      <View style={styles.texts}>
        <Text style={[styles.label, { color: c.text }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: c.textMuted }]}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: c.primary, false: '#C9CED6' }}
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
  },
  disabled: { opacity: 0.5 },
  texts: { flex: 1, paddingRight: 12 },
  label: { fontSize: 16, fontWeight: '500' },
  hint: { fontSize: 13, marginTop: 2 },
});
