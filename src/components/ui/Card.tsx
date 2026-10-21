// Reusable Card Component
import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { THEME } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  subtle?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress, subtle }) => {
  const content = (
    <View
      style={[
        styles.card,
        subtle ? styles.cardSubtle : styles.cardShadow,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardShadow: {
    ...THEME.shadows.card,
  },
  cardSubtle: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderColor: 'transparent',
  },
});
