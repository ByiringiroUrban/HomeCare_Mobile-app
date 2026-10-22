// Patient Home Screen (SRS Section 5 - Home)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { THEME, APP_CONFIG } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { patientService } from '../../services/api';
import { DoctorCard } from '../../components/ui/DoctorCard';
import { VisitCard } from '../../components/ui/VisitCard';

export default function PatientHomeScreen() {
  const { currentUser, patientProfile } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  // Active / Upcoming visits query
  const { data: visits = [], refetch: refetchVisits } = useQuery({
    queryKey: ['patient-visits', currentUser?.id],
    queryFn: () => patientService.getVisits(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  // Specialties
  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => patientService.getSpecialties(),
  });

  // Recommended Specialists
  const { data: doctors = [], refetch: refetchDoctors } = useQuery({
    queryKey: ['recommended-doctors'],
    queryFn: () => patientService.searchDoctors({ minRating: 4.8 }),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchVisits(), refetchDoctors()]);
    setRefreshing(false);
  };

  const upcomingVisit = visits.find((v) =>
    ['pending', 'confirmed', 'alternative_proposed', 'on_the_way', 'arrived', 'in_consultation'].includes(
      v.status
    )
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Brand Banner with Official Logo */}
        <View style={styles.brandRow}>
          <Image
            source={require('../../../assets/homecare-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Pressable
            style={styles.notifBtn}
            onPress={() => router.push('/(patient)/notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color={THEME.colors.textPrimary} />
          </Pressable>
        </View>

        {/* Greeting & Location Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Muraho, {currentUser?.name?.split(' ')[0] || 'Patient'}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={13} color={THEME.colors.primary} style={{ marginRight: 3 }} />
              <Text style={styles.locationText} numberOfLines={1}>
                {patientProfile?.district ? `${patientProfile.district}, Kigali` : 'Kigali, Rwanda'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Search & Discovery Action Bar */}
        <View style={styles.searchBarContainer}>
          <Pressable
            style={styles.searchBarButton}
            onPress={() => router.push('/(patient)/doctors')}
          >
            <Ionicons name="search-outline" size={18} color={THEME.colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.searchBarPlaceholder}>Find specialist, symptom, or district...</Text>
          </Pressable>
        </View>

        {/* Live Active / Upcoming Visit Banner (Only if patient has a real visit) */}
        {upcomingVisit && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Home Consultation</Text>
              <Pressable onPress={() => router.push('/(patient)/visits')}>
                <Text style={styles.sectionAction}>All Visits ›</Text>
              </Pressable>
            </View>
            <VisitCard
              visit={upcomingVisit}
              viewerRole="patient"
              onPress={() => router.push(`/(patient)/visit/${upcomingVisit.id}` as any)}
              actionLabel="View Status Timeline"
              onActionPress={() => router.push(`/(patient)/visit/${upcomingVisit.id}` as any)}
            />
          </View>
        )}

        {/* Quick Medical Specialties */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medical Specialties</Text>
            <Pressable onPress={() => router.push('/(patient)/doctors')}>
              <Text style={styles.sectionAction}>See All ›</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specScroll}>
            {specialties.slice(0, 5).map((spec) => (
              <Pressable
                key={spec.id}
                style={styles.specChip}
                onPress={() =>
                  router.push({
                    pathname: '/(patient)/doctors',
                    params: { initialSpecialty: spec.name },
                  })
                }
              >
                <View style={styles.specIconCircle}>
                  <Ionicons name="medkit-outline" size={18} color={THEME.colors.primary} />
                </View>
                <Text style={styles.specName} numberOfLines={1}>{spec.name}</Text>
                <Text style={styles.specCount}>{spec.doctorCount} doctors</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Recommended Verified Specialists */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Verified Specialists</Text>
            <Pressable onPress={() => router.push('/(patient)/doctors')}>
              <Text style={styles.sectionAction}>View All ({doctors.length}) ›</Text>
            </Pressable>
          </View>

          {doctors.slice(0, 2).map((doctor) => (
            <DoctorCard
              key={doctor.userId}
              doctor={doctor}
              onPress={() => router.push(`/(patient)/doctor/${doctor.userId}` as any)}
              onBookPress={() => router.push(`/(patient)/book/${doctor.userId}` as any)}
            />
          ))}
        </View>

        {/* Compact Emergency Call Help at bottom */}
        <View style={styles.emergencyFooter}>
          <Ionicons name="information-circle-outline" size={14} color={THEME.colors.textMuted} />
          <Text style={styles.emergencyFooterText}>
            Medical Emergency in Rwanda? Call SAMU Helpline <Text style={styles.emergencyNumber}>112</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: THEME.spacing.xxl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.base,
    paddingTop: THEME.spacing.sm,
    paddingBottom: 4,
  },
  logoImage: {
    width: 145,
    height: 42,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.base,
    paddingTop: 2,
    paddingBottom: THEME.spacing.sm,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  notifIcon: {
    fontSize: 18,
  },
  section: {
    paddingHorizontal: THEME.spacing.base,
    marginBottom: THEME.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionAction: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  searchBarContainer: {
    paddingHorizontal: THEME.spacing.base,
    marginBottom: THEME.spacing.md,
  },
  searchBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchBarPlaceholder: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  specScroll: {
    flexDirection: 'row',
    marginHorizontal: -THEME.spacing.base,
    paddingHorizontal: THEME.spacing.base,
  },
  specChip: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: 10,
    marginRight: 10,
    width: 105,
    alignItems: 'center',
  },
  specIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  specName: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  specCount: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  emergencyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 5,
  },
  emergencyFooterText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  emergencyNumber: {
    fontWeight: '800',
    color: THEME.colors.error,
  },
});
