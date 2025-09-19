// src/ui/components.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

export const Card: React.FC<React.PropsWithChildren<{ style?: ViewStyle }>> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const PrimaryButton: React.FC<{ title: string; onPress?: () => void; disabled?: boolean; style?: ViewStyle; textStyle?: TextStyle; }> = ({ title, onPress, disabled, style, textStyle }) => (
  <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.primaryBtn, disabled && { opacity: 0.6 }, style]}>
    <Text style={[styles.primaryTxt, textStyle]}>{title}</Text>
  </TouchableOpacity>
);

export const SecondaryButton: React.FC<{ title: string; onPress?: () => void; disabled?: boolean; style?: ViewStyle; textStyle?: TextStyle; }> = ({ title, onPress, disabled, style, textStyle }) => (
  <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.secondaryBtn, disabled && { opacity: 0.6 }, style]}>
    <Text style={[styles.secondaryTxt, textStyle]}>{title}</Text>
  </TouchableOpacity>
);

export const Chip: React.FC<React.PropsWithChildren<{ onPress?: () => void }>> = ({ children, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.chip}>
    <Text>{children}</Text>
  </TouchableOpacity>
);

export const StatusDot: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => (
  <View style={{ width: size, height: size, borderRadius: size/2, backgroundColor: color, marginBottom: theme.space(2) }} />
);

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: theme.layout.maxWidth,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.space(4),
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
    alignItems: 'center',
  },
  primaryBtn: {
    paddingVertical: theme.space(3),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryTxt: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    paddingVertical: theme.space(3),
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.chipBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  secondaryTxt: { color: theme.colors.text, fontWeight: '600' },
  chip: {
    paddingHorizontal: theme.space(3),
    paddingVertical: theme.space(2),
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.chipBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
