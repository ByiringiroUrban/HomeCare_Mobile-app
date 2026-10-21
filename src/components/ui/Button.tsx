// Reusable Button Component
import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import { THEME } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const isInteractive = !disabled && !loading;

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        disabled && styles.disabled,
        pressed && isInteractive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? THEME.colors.primary : THEME.colors.textWhite}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.textBase,
              styles[`text_${variant}`],
              styles[`textSize_${size}`],
              disabled && styles.textDisabled,
              icon ? { marginLeft: 8 } : null,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: THEME.borderRadius.md,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.5,
  },
  primary: {
    backgroundColor: THEME.colors.primary,
  },
  secondary: {
    backgroundColor: THEME.colors.accentSoft,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: THEME.colors.primary,
  },
  danger: {
    backgroundColor: THEME.colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  size_lg: {
    paddingVertical: 15,
    paddingHorizontal: 22,
  },
  textBase: {
    fontWeight: '600',
    textAlign: 'center',
  },
  text_primary: {
    color: THEME.colors.textWhite,
  },
  text_secondary: {
    color: THEME.colors.accent,
  },
  text_outline: {
    color: THEME.colors.primary,
  },
  text_danger: {
    color: THEME.colors.textWhite,
  },
  text_ghost: {
    color: THEME.colors.textSecondary,
  },
  textDisabled: {
    color: THEME.colors.textMuted,
  },
  textSize_sm: {
    fontSize: THEME.typography.sizes.sm,
  },
  textSize_md: {
    fontSize: THEME.typography.sizes.base,
  },
  textSize_lg: {
    fontSize: THEME.typography.sizes.md,
  },
});
