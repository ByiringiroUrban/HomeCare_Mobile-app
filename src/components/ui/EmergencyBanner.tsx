// Reusable Emergency Disclaimer Banner (SRS FR-1.1 & NFR-9.1)
import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { THEME, APP_CONFIG } from '../../constants/theme';

export const EmergencyBanner: React.FC = () => {
  const handleCallEmergency = () => {
    Linking.openURL(`tel:${APP_CONFIG.emergencyPhone}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>EMERGENCY NOTICE</Text>
        </View>
        <Text style={styles.description}>{APP_CONFIG.emergencyDisclaimer}</Text>
      </View>
      <Pressable onPress={handleCallEmergency} style={styles.callButton}>
        <Text style={styles.callButtonText}>CALL 112</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.errorSoft,
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginHorizontal: THEME.spacing.base,
    marginBottom: THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingRight: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.error,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  description: {
    color: '#991B1B',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  callButton: {
    backgroundColor: THEME.colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
  },
  callButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
