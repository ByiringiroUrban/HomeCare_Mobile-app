// Patient Home Screen (SRS Section 5 - Home)
import React, { useEffect, useState } from 'react';
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
import { CountryChips } from '../../components/ui/CountryChips';
import { useCountry, useLocaleStore } from '../../stores/localeStore';

export default function PatientHomeScreen() {
  const { currentUser, patientProfile } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const country = useCountry();
  const { setCountry } = useLocaleStore();

  // Follow the signed-in patient's home market
  useEffect(() => {
    if (patientProfile?.country) {
      useLocaleStore.getState().syncFromProfile(patientProfile.country);
    }
  }, [patientProfile?.country]);

  // Active / Upcoming visits query
  const { data: visits = [], refetch: refetchVisits } = useQuery({
    queryKey: ['patient-visits', currentUser?.id],
    queryFn: () => patientService.getVisits(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  // Published consultation records — used to surface the newest prescription live
  const { data: records } = useQuery({
    queryKey: ['patient-records', currentUser?.id],
    queryFn: () => patientService.getRecords(currentUser?.id || ''),
    enabled: !!currentUser,
    refetchInterval: 5000,
  });

  const latestPrescription = records?.consultations.find((rec) => rec.prescriptions.length > 0);

  // Specialties
  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => patientService.getSpecialties(),
  });

  // Recommended Specialists in the selected market
  const { data: doctors = [], refetch: refetchDoctors } = useQuery({
    queryKey: ['recommended-doctors', country.code],
    queryFn: () => patientService.searchDoctors({ country: country.code }),
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
                {patientProfile?.district
                  ? `${patientProfile.district}, ${patientProfile.city || country.capitalCity}`
                  : `${country.capitalCity}, ${country.name}`}
              </Text>
            </View>
          </View>
        </View>

        {/* East African market selector */}
        <CountryChips
          value={country.code}
          onChange={setCountry}
          label="Care market"
          style={styles.marketPicker}
        />

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

        {/* Latest Prescription issued by the doctor (e.g. during an online consultation) */}
        {latestPrescription && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Latest Prescription</Text>
              <Pressable onPress={() => router.push('/(patient)/records' as any)}>
                <Text style={styles.sectionAction}>All Records ›</Text>
              </Pressable>
            </View>
            <Pressable
              style={styles.rxCard}
              onPress={() => router.push('/(patient)/records' as any)}
            >
              <View style={styles.rxCardHeader}>
                <Text style={styles.rxCardBadge}>℞ PRESCRIPTION</Text>
                <Text style={styles.rxCardDate}>
                  {latestPrescription.createdAt.split('T')[0]}
                </Text>
              </View>
              {latestPrescription.prescriptions.slice(0, 2).map((rx) => (
                <View key={rx.id} style={styles.rxLine}>
                  <Text style={styles.rxMed} numberOfLines={1}>
                    {rx.medicationName}
                  </Text>
                  <Text style={styles.rxDetail} numberOfLines={1}>
                    {rx.dosage} · {rx.frequency} · {rx.durationDays} days
                  </Text>
                </View>
              ))}
              {latestPrescription.prescriptions.length > 2 && (
                <Text style={styles.rxMore}>
                  +{latestPrescription.prescriptions.length - 2} more medication(s)
                </Text>
              )}
              <Text style={styles.rxHint}>Tap to view the full prescription ›</Text>
            </Pressable>
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
            Medical emergency in {country.name}? Call {country.emergencyService} on{' '}
            <Text style={styles.emergencyNumber}>{country.emergencyPhone}</Text>
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
  marketPicker: {
    paddingHorizontal: THEME.spacing.base,
    marginTop: THEME.spacing.xs,
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
  rxCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.base,
  },
  rxCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rxCardBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  rxCardDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  rxLine: {
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
  },
  rxMed: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  rxDetail: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  rxMore: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  rxHint: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '700',
    marginTop: 8,
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
