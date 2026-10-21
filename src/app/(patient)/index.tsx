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
import { THEME, APP_CONFIG } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { patientService } from '../../services/api';
import { EmergencyBanner } from '../../components/ui/EmergencyBanner';
import { Card } from '../../components/ui/Card';
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

  // Medical records & results
  const { data: recordsData, refetch: refetchRecords } = useQuery({
    queryKey: ['patient-records', currentUser?.id],
    queryFn: () => patientService.getRecords(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchVisits(), refetchDoctors(), refetchRecords()]);
    setRefreshing(false);
  };

  const upcomingVisit = visits.find((v) =>
    ['pending', 'confirmed', 'alternative_proposed', 'on_the_way', 'arrived', 'in_consultation'].includes(
      v.status
    )
  );

  const recentResult = recordsData?.results?.[0];

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
            <Text style={styles.notifIcon}>🔔</Text>
          </Pressable>
        </View>

        {/* Greeting & Location Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Muraho, {currentUser?.name?.split(' ')[0] || 'Patient'} 👋</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText} numberOfLines={1}>
                {patientProfile?.district ? `${patientProfile.district}, Kigali` : 'Kigali, Rwanda'}
              </Text>
            </View>
          </View>
        </View>

        {/* Emergency Disclaimer Banner */}
        <EmergencyBanner />

        {/* Live Active / Upcoming Visit Banner */}
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

        {/* Quick Symptoms / Specialty Directory */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medical Specialties</Text>
            <Pressable onPress={() => router.push('/(patient)/doctors')}>
              <Text style={styles.sectionAction}>See All ({specialties.length}) ›</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specScroll}>
            {specialties.map((spec) => (
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
                  <Text style={styles.specIconText}>🩺</Text>
                </View>
                <Text style={styles.specName}>{spec.name}</Text>
                <Text style={styles.specCount}>{spec.doctorCount} doctors</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Recent Laboratory Examination Results */}
        {recentResult && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Laboratory Results</Text>
              <Pressable onPress={() => router.push('/(patient)/records')}>
                <Text style={styles.sectionAction}>View Records ›</Text>
              </Pressable>
            </View>
            <Card
              style={styles.resultCard}
              onPress={() => router.push(`/(patient)/result/${recentResult.id}` as any)}
            >
              <View style={styles.resultHeader}>
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>VALIDATED</Text>
                </View>
                <Text style={styles.resultDate}>{recentResult.publishedAt.split('T')[0]}</Text>
              </View>
              <Text style={styles.resultTitle}>{recentResult.title}</Text>
              <Text style={styles.resultFindings} numberOfLines={2}>
                {recentResult.summaryFindings}
              </Text>
              <View style={styles.resultFooter}>
                <Text style={styles.resultDoctor}>By {recentResult.doctorName}</Text>
                <Text style={styles.downloadPdfLink}>Download PDF ›</Text>
              </View>
            </Card>
          </View>
        )}

        {/* Recommended Verified Specialists */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended Verified Specialists</Text>
            <Pressable onPress={() => router.push('/(patient)/doctors')}>
              <Text style={styles.sectionAction}>View All ›</Text>
            </Pressable>
          </View>

          {doctors.slice(0, 3).map((doctor) => (
            <DoctorCard
              key={doctor.userId}
              doctor={doctor}
              onPress={() => router.push(`/(patient)/doctor/${doctor.userId}` as any)}
              onBookPress={() => router.push(`/(patient)/book/${doctor.userId}` as any)}
            />
          ))}
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
    padding: 12,
    marginRight: 10,
    width: 130,
    alignItems: 'center',
  },
  specIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  specIconText: {
    fontSize: 20,
  },
  specName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  specCount: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  resultCard: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resultBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  resultDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  resultFindings: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#CCFBF1',
    paddingTop: 8,
  },
  resultDoctor: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  downloadPdfLink: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
});
