// Doctor Profile & Credentials Screen (SRS FR-1.6, FR-4.1)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export default function DoctorProfileScreen() {
  const { currentUser, doctorProfile, logout, resetDemoData } = useAuthStore();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Credentials Card */}
      <Card style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{currentUser?.name.charAt(0) || 'D'}</Text>
        </View>
        <Text style={styles.name}>{currentUser?.name}</Text>
        <Text style={styles.specialty}>{doctorProfile?.specialty}</Text>
        <Text style={styles.subText}>{currentUser?.email}</Text>
        <Text style={styles.subText}>{currentUser?.phone}</Text>

        <View style={styles.badgeRow}>
          <Badge status={doctorProfile?.verificationStatus || 'pending'} size="md" />
        </View>
      </Card>

      {/* Professional Licensing Information */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Licensing & Accreditation</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Medical Council License:</Text>
          <Text style={styles.value}>{doctorProfile?.licenseNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Clinical Experience:</Text>
          <Text style={styles.value}>{doctorProfile?.experienceYears} Years</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Average Rating:</Text>
          <Text style={styles.value}>★ {doctorProfile?.rating?.toFixed(1) || '0.0'} ({doctorProfile?.reviewCount || 0} reviews)</Text>
        </View>

        <View style={styles.divider} />
        <Text style={styles.label}>Verified Qualifications:</Text>
        {doctorProfile?.qualifications.map((q, idx) => (
          <Text key={idx} style={styles.bulletItem}>
            • {q}
          </Text>
        ))}
      </Card>

      {/* Coverage & Fees */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Service Rates & Kigali Districts</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Consultation Fee:</Text>
          <Text style={styles.value}>
            {doctorProfile?.consultationFeeRwf.toLocaleString()} RWF
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Travel Allowance:</Text>
          <Text style={styles.value}>{doctorProfile?.travelFeeRwf.toLocaleString()} RWF</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Coverage Districts:</Text>
          <Text style={styles.value}>{doctorProfile?.coverageDistricts.join(', ')}</Text>
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Reset Demo Data"
          variant="secondary"
          onPress={() => {
            resetDemoData();
            alert('Demo domain data restored to initial state.');
          }}
          style={{ marginBottom: 10 }}
        />
        <Button
          title="Sign Out"
          variant="danger"
          onPress={() => {
            logout();
            router.replace('/(auth)/welcome');
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    paddingBottom: 60,
  },
  card: {
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  specialty: {
    fontSize: 13,
    color: THEME.colors.primaryDark,
    fontWeight: '700',
    marginTop: 2,
  },
  subText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  badgeRow: {
    marginTop: 10,
  },
  sectionCard: {
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: 8,
  },
  bulletItem: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    marginTop: THEME.spacing.sm,
  },
});
