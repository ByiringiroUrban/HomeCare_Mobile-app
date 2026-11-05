// Reusable Form Input Field
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  secureTextEntry,
  ...props
}) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={[
            styles.input,
            isPassword ? styles.inputWithToggle : null,
            error ? styles.inputError : null,
            props.multiline ? styles.multilineInput : null,
            style,
          ]}
          placeholderTextColor={THEME.colors.textMuted}
          {...props}
          secureTextEntry={isPassword && !passwordVisible}
          autoCorrect={isPassword ? false : props.autoCorrect}
          autoCapitalize={isPassword ? 'none' : props.autoCapitalize}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.toggle}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            hitSlop={8}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={THEME.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
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
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
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
  inputWithToggle: {
    paddingRight: 44,
  },
  toggle: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
