// Reusable Status Badge Component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../constants/theme';
import { VisitStatus, DoctorVerificationStatus } from '../../types/domain';

interface BadgeProps {
  status: VisitStatus | DoctorVerificationStatus | string;
  label?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, label, size = 'sm' }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'pending':
        return {
          bg: THEME.colors.badgePendingBg,
          text: THEME.colors.badgePendingText,
          defaultLabel: 'Pending',
        };
      case 'confirmed':
        return {
          bg: THEME.colors.badgeConfirmedBg,
          text: THEME.colors.badgeConfirmedText,
          defaultLabel: 'Confirmed',
        };
      case 'alternative_proposed':
        return {
          bg: '#FEF9C3',
          text: '#854D0E',
          defaultLabel: 'Alternative Time Proposed',
        };
      case 'on_the_way':
        return {
          bg: '#E0E7FF',
          text: '#3730A3',
          defaultLabel: 'On the Way',
        };
      case 'arrived':
        return {
          bg: '#C7D2FE',
          text: '#312E81',
          defaultLabel: 'Doctor Arrived',
        };
      case 'in_consultation':
        return {
          bg: '#EDE9FE',
          text: '#5B21B6',
          defaultLabel: 'In Consultation',
        };
      case 'completed':
      case 'approved':
        return {
          bg: THEME.colors.badgeCompletedBg,
          text: THEME.colors.badgeCompletedText,
          defaultLabel: status === 'approved' ? 'Verified' : 'Completed',
        };
      case 'declined':
      case 'cancelled':
      case 'suspended':
      case 'expired':
        return {
          bg: THEME.colors.badgeCancelledBg,
          text: THEME.colors.badgeCancelledText,
          defaultLabel: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
        };
      default:
        return {
          bg: THEME.colors.surfaceSubtle,
          text: THEME.colors.textSecondary,
          defaultLabel: status,
        };
    }
  };

  const config = getBadgeStyle();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        size === 'md' ? styles.badgeMd : styles.badgeSm,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.text },
          size === 'md' ? styles.textMd : styles.textSm,
        ]}
      >
        {label || config.defaultLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: THEME.borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeMd: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  text: {
    fontWeight: '600',
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 13,
  },
});
