// Market selector shared by patient discovery, registration and profile screens.
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { COUNTRY_LIST, SupportedCountry, THEME } from '../../constants/theme';

interface CountryChipsProps {
  value: SupportedCountry;
  onChange: (code: SupportedCountry) => void;
  label?: string;
  style?: object;
}

export const CountryChips: React.FC<CountryChipsProps> = ({ value, onChange, label, style }) => (
  <View style={[styles.wrapper, style]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {COUNTRY_LIST.map((country) => {
        const active = country.code === value;
        return (
          <Pressable
            key={country.code}
            onPress={() => onChange(country.code)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={styles.flag}>{country.flag}</Text>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {country.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: THEME.spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  row: {
    gap: 8,
    paddingRight: THEME.spacing.base,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  flag: {
    fontSize: 14,
    marginRight: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFF',
  },
});
