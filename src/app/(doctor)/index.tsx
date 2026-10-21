// Doctor Dashboard Screen (SRS Section 6 - Dashboard)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { doctorService } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { VisitCard } from '../../components/ui/VisitCard';
import { Button } from '../../components/ui/Button';

export default function DoctorDashboardScreen() {
  const { currentUser, doctorProfile, refreshProfile } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data: visits = [], refetch } = useQuery({
    queryKey: ['doctor-visits', currentUser?.id],
    queryFn: () => doctorService.getVisits(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refreshProfile()]);
    setRefreshing(false);
  };

  const handleToggleOnline = async (val: boolean) => {
    if (!currentUser) return;
    try {
      await doctorService.toggleOnline(currentUser.id, val);
      await refreshProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to update online status');
    }
  };

  // Filter pending requests and today's visits
  const pendingRequests = visits.filter((v) => v.status === 'pending');
  const activeVisits = visits.filter((v) =>
    ['confirmed', 'on_the_way', 'arrived', 'in_consultation'].includes(v.status)
  );
  const completedVisits = visits.filter((v) => v.status === 'completed');

  const isVerified = doctorProfile?.verificationStatus === 'approved';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Doctor Brand & Header Banner */}
        <View style={styles.brandRow}>
          <Image
            source={require('../../../assets/homecare-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Badge status={doctorProfile?.verificationStatus || 'pending'} size="md" />
        </View>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Dr. {currentUser?.name?.replace(/^Dr\.\s*/, '')}</Text>
            <Text style={styles.specialtyTag}>
              {doctorProfile?.specialty} • {doctorProfile?.licenseNumber}
            </Text>
          </View>
        </View>

        {/* Verification Warning for Unapproved Doctors (FR-1.6, FR-4.3) */}
        {!isVerified && (
          <View style={styles.verificationNotice}>
            <Text style={styles.verificationNoticeTitle}>Credentials Pending Review</Text>
            <Text style={styles.verificationNoticeText}>
              Your license is undergoing administrative verification. You will be able to receive and accept home consultation requests once approved.
            </Text>
          </View>
        )}

        {/* Online / Offline Quick Toggle (FR-4.1) */}
        <Card style={styles.statusToggleCard}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>
              {doctorProfile?.isOnline ? '🟢 Available for Home Visits' : '⚪ Offline / Unavailable'}
            </Text>
            <Text style={styles.toggleSub}>
              {doctorProfile?.isOnline
                ? 'Visible in Kigali specialist search'
                : 'Patients cannot book urgent visits'}
            </Text>
          </View>
          <Switch
            value={!!doctorProfile?.isOnline}
            onValueChange={handleToggleOnline}
            disabled={!isVerified}
            trackColor={{ false: '#CBD5E1', true: THEME.colors.primary }}
          />
        </Card>

        {/* Quick Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{pendingRequests.length}</Text>
            <Text style={styles.metricLabel}>Pending Requests</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{activeVisits.length}</Text>
            <Text style={styles.metricLabel}>Active Visits</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{completedVisits.length}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>
        </View>

        {/* Urgent Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Pending Visit Requests ({pendingRequests.length})</Text>
              <Pressable onPress={() => router.push('/(doctor)/requests')}>
                <Text style={styles.sectionAction}>View All ›</Text>
              </Pressable>
            </View>

            {pendingRequests.slice(0, 2).map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                viewerRole="doctor"
                onPress={() => router.push('/(doctor)/requests')}
                actionLabel="Review & Respond"
                onActionPress={() => router.push('/(doctor)/requests')}
              />
            ))}
          </View>
        )}

        {/* Active In-Progress Visits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Visits Execution</Text>
          {activeVisits.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No active home visits currently underway.</Text>
            </Card>
          ) : (
            activeVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                viewerRole="doctor"
                onPress={() => router.push(`/(doctor)/visit/${visit.id}` as any)}
                actionLabel="Open Visit Cockpit"
                onActionPress={() => router.push(`/(doctor)/visit/${visit.id}` as any)}
              />
            ))
          )}
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
    padding: THEME.spacing.base,
    paddingBottom: THEME.spacing.xxl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xs,
  },
  logoImage: {
    width: 145,
    height: 42,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  specialtyTag: {
    fontSize: 12,
    color: THEME.colors.primaryDark,
    fontWeight: '600',
    marginTop: 2,
  },
  verificationNotice: {
    backgroundColor: THEME.colors.warningSoft,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  verificationNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  verificationNoticeText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 16,
  },
  statusToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  toggleSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: THEME.spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  metricLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    marginBottom: THEME.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  sectionAction: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
});
