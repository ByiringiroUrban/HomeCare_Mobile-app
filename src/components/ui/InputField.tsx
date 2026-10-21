// Reusable Form Input Field
import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { THEME } from '../../constants/theme';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  hint,
  containerStyle,
  style,
  ...props
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : null,
          props.multiline ? styles.multilineInput : null,
          style,
        ]}
        placeholderTextColor={THEME.colors.textMuted}
        {...props}
      />
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: THEME.spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  inputError: {
    borderColor: THEME.colors.error,
    backgroundColor: '#FEF2F2',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  error: {
    fontSize: 12,
    color: THEME.colors.error,
    marginTop: 4,
    fontWeight: '500',
  },
});
