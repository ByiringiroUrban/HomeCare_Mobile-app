// Administration Console (SRS Section 9 & FR-10.1, FR-10.2, FR-10.3, FR-10.4, FR-10.5)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { THEME, COUNTRY_LIST } from '../../constants/theme';
import { formatMoney } from '../../utils/money';
import { useAuthStore } from '../../stores/authStore';
import { adminService, metaService } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

type TabType = 'metrics' | 'doctors' | 'complaints' | 'audit';
type DoctorFilterType = 'all' | 'pending' | 'approved' | 'suspended';
type ComplaintFilterType = 'all' | 'open' | 'resolved';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

function IconWell({
  name,
  color = THEME.colors.primary,
  backgroundColor = THEME.colors.primarySoft,
  size = 38,
  iconSize = 18,
}: {
  name: IoniconName;
  color?: string;
  backgroundColor?: string;
  size?: number;
  iconSize?: number;
}) {
  return (
    <View
      style={[
        styles.iconWell,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Ionicons name={name} size={iconSize} color={color} />
    </View>
  );
}

export default function AdminConsoleScreen() {
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('metrics');
  const [doctorFilter, setDoctorFilter] = useState<DoctorFilterType>('all');
  const [complaintFilter, setComplaintFilter] = useState<ComplaintFilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminService.getPlatformMetrics(),
  });

  const { data: doctors = [], refetch: refetchDoctors } = useQuery({
    queryKey: ['admin-doctors'],
    queryFn: () => adminService.getAllDoctors(),
  });

  const { data: complaints = [], refetch: refetchComplaints } = useQuery({
    queryKey: ['admin-complaints'],
    queryFn: () => adminService.getComplaints(),
  });

  const { data: auditLogs = [], refetch: refetchAudit } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: () => adminService.getAuditLogs(),
  });

  const { data: config } = useQuery({
    queryKey: ['platform-config'],
    queryFn: () => metaService.getConfig(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMetrics(), refetchDoctors(), refetchComplaints(), refetchAudit()]);
    setRefreshing(false);
  };

  const handleUpdateDoctorStatus = async (
    doctorId: string,
    status: 'approved' | 'pending' | 'suspended'
  ) => {
    try {
      await adminService.updateDoctorVerification(doctorId, status);
      refetchDoctors();
      refetchMetrics();
      Alert.alert('Status Updated', `Doctor status successfully changed to ${status.toUpperCase()}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Status update failed.');
    }
  };

  const handleResolveComplaint = async (complaintId: string) => {
    try {
      await adminService.resolveComplaint(complaintId, 'Reviewed and resolved by Platform Compliance Admin.');
      refetchComplaints();
      Alert.alert('Complaint Resolved', 'The complaint status has been marked as resolved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resolve complaint.');
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    if (doctorFilter === 'all') return true;
    return d.verificationStatus === doctorFilter;
  });

  const pendingDoctorsCount = doctors.filter((d) => d.verificationStatus === 'pending').length;
  const approvedDoctorsCount = doctors.filter((d) => d.verificationStatus === 'approved').length;
  const suspendedDoctorsCount = doctors.filter((d) => d.verificationStatus === 'suspended').length;

  const filteredComplaints = complaints.filter((c) => {
    if (complaintFilter === 'all') return true;
    if (complaintFilter === 'open') return c.status !== 'resolved';
    return c.status === 'resolved';
  });

  const pendingComplaintsCount = complaints.filter((c) => c.status !== 'resolved').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.colors.primary]} />}
      >
        <View style={styles.brandRow}>
          <Image
            source={require('../../../assets/homecare-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.brandActions}>
            <Pressable
              style={styles.iconBtn}
              onPress={() => {
                logout();
                router.replace('/(auth)/welcome');
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={THEME.colors.error} />
            </Pressable>
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.greeting}>Platform Admin</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color={THEME.colors.primary} style={{ marginRight: 3 }} />
            <Text style={styles.locationText}>East Africa Healthcare Network</Text>
          </View>
        </View>

        <View style={styles.summaryBar}>
          <Pressable
            style={[styles.summaryChip, activeTab === 'doctors' && doctorFilter !== 'pending' && styles.summaryChipActive]}
            onPress={() => setActiveTab('doctors')}
          >
            <IconWell
              name="medkit-outline"
              size={36}
              iconSize={17}
              color={activeTab === 'doctors' && doctorFilter !== 'pending' ? THEME.colors.textWhite : THEME.colors.primary}
              backgroundColor={
                activeTab === 'doctors' && doctorFilter !== 'pending'
                  ? 'rgba(255,255,255,0.18)'
                  : THEME.colors.primarySoft
              }
            />
            <Text
              style={[
                styles.summaryNumber,
                activeTab === 'doctors' && doctorFilter !== 'pending' && styles.summaryTextActive,
              ]}
            >
              {doctors.length}
            </Text>
            <Text
              style={[
                styles.summaryLabel,
                activeTab === 'doctors' && doctorFilter !== 'pending' && styles.summaryTextActive,
              ]}
            >
              Doctors
            </Text>
          </Pressable>

          <Pressable
            style={[styles.summaryChip, activeTab === 'doctors' && doctorFilter === 'pending' && styles.summaryChipActive]}
            onPress={() => {
              setActiveTab('doctors');
              setDoctorFilter('pending');
            }}
          >
            <IconWell
              name="time-outline"
              size={36}
              iconSize={17}
              color={pendingDoctorsCount > 0 ? THEME.colors.warning : THEME.colors.textMuted}
              backgroundColor={pendingDoctorsCount > 0 ? THEME.colors.warningSoft : THEME.colors.surfaceSubtle}
            />
            <Text style={[styles.summaryNumber, pendingDoctorsCount > 0 && { color: THEME.colors.warning }]}>
              {pendingDoctorsCount}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </Pressable>

          <Pressable
            style={[styles.summaryChip, activeTab === 'complaints' && styles.summaryChipActive]}
            onPress={() => setActiveTab('complaints')}
          >
            <IconWell
              name="chatbox-ellipses-outline"
              size={36}
              iconSize={17}
              color={
                activeTab === 'complaints'
                  ? THEME.colors.textWhite
                  : pendingComplaintsCount > 0
                    ? THEME.colors.error
                    : THEME.colors.success
              }
              backgroundColor={
                activeTab === 'complaints'
                  ? 'rgba(255,255,255,0.18)'
                  : pendingComplaintsCount > 0
                    ? THEME.colors.errorSoft
                    : THEME.colors.successSoft
              }
            />
            <Text
              style={[
                styles.summaryNumber,
                activeTab === 'complaints' && styles.summaryTextActive,
                activeTab !== 'complaints' && {
                  color: pendingComplaintsCount > 0 ? THEME.colors.error : THEME.colors.success,
                },
              ]}
            >
              {complaints.length}
            </Text>
            <Text style={[styles.summaryLabel, activeTab === 'complaints' && styles.summaryTextActive]}>
              Complaints
            </Text>
          </Pressable>

          <Pressable
            style={[styles.summaryChip, activeTab === 'audit' && styles.summaryChipActive]}
            onPress={() => setActiveTab('audit')}
          >
            <IconWell
              name="shield-checkmark-outline"
              size={36}
              iconSize={17}
              color={activeTab === 'audit' ? THEME.colors.textWhite : THEME.colors.primary}
              backgroundColor={activeTab === 'audit' ? 'rgba(255,255,255,0.18)' : THEME.colors.primarySoft}
            />
            <Text style={[styles.summaryNumber, activeTab === 'audit' && styles.summaryTextActive]}>
              {auditLogs.length}
            </Text>
            <Text style={[styles.summaryLabel, activeTab === 'audit' && styles.summaryTextActive]}>Audit</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
          style={styles.tabContainer}
        >
          {(
            [
              { id: 'metrics' as const, label: 'Overview', icon: 'home-outline', iconActive: 'home' },
              { id: 'doctors' as const, label: 'Doctors', icon: 'medkit-outline', iconActive: 'medkit', count: doctors.length },
              {
                id: 'complaints' as const,
                label: 'Complaints',
                icon: 'chatbox-ellipses-outline',
                iconActive: 'chatbox-ellipses',
                count: pendingComplaintsCount || undefined,
                warn: pendingComplaintsCount > 0,
              },
              { id: 'audit' as const, label: 'Audit', icon: 'document-text-outline', iconActive: 'document-text', count: auditLogs.length },
            ] as const
          ).map((tab) => {
            const focused = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tabPill, focused && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={(focused ? tab.iconActive : tab.icon) as IoniconName}
                  size={16}
                  color={focused ? THEME.colors.primary : THEME.colors.textMuted}
                />
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{tab.label}</Text>
                {'count' in tab && tab.count !== undefined && (
                  <View style={[styles.tabBadge, focused && styles.tabBadgeActive, 'warn' in tab && tab.warn && !focused && styles.tabBadgeWarn]}>
                    <Text
                      style={[
                        styles.tabBadgeText,
                        focused && styles.tabBadgeTextActive,
                        'warn' in tab && tab.warn && !focused && styles.tabBadgeTextWarn,
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === 'metrics' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Operational Performance</Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <IconWell name="calendar-outline" />
                <Text style={styles.metricVal}>{metrics?.totalVisits || 0}</Text>
                <Text style={styles.metricLbl}>Total Consultations</Text>
              </View>

              <View style={styles.metricCard}>
                <IconWell name="checkmark-circle-outline" color={THEME.colors.success} backgroundColor={THEME.colors.successSoft} />
                <Text style={styles.metricVal}>{metrics?.completedVisits || 0}</Text>
                <Text style={styles.metricLbl}>Completed Visits</Text>
              </View>

              <View style={styles.metricCard}>
                <IconWell name="navigate-outline" />
                <Text style={styles.metricVal}>{metrics?.activeVisits || 0}</Text>
                <Text style={styles.metricLbl}>Active Underway</Text>
              </View>

              <View style={styles.metricCard}>
                <IconWell name="wallet-outline" />
                <Text style={styles.metricVal} numberOfLines={2}>
                  {Object.keys(metrics?.revenueByCurrency || {}).length === 0
                    ? '0 RWF'
                    : Object.entries(metrics?.revenueByCurrency || {})
                        .map(([currency, amount]) => formatMoney(amount, currency))
                        .join(' · ')}
                </Text>
                <Text style={styles.metricLbl}>Fees Collected per Market</Text>
              </View>

              <View style={styles.metricCard}>
                <IconWell name="star" color={THEME.colors.warning} backgroundColor={THEME.colors.warningSoft} />
                <View style={styles.ratingRow}>
                  <Text style={styles.metricVal}>{metrics?.avgRating || 0}</Text>
                  <Text style={styles.maxRatingText}>/ 5.0</Text>
                </View>
                <Text style={styles.metricLbl}>Avg. Doctor Rating</Text>
              </View>

              <View style={[styles.metricCard, pendingDoctorsCount > 0 && styles.metricCardAlert]}>
                <IconWell
                  name="hourglass-outline"
                  color={THEME.colors.error}
                  backgroundColor={THEME.colors.errorSoft}
                />
                <Text style={[styles.metricVal, pendingDoctorsCount > 0 && { color: THEME.colors.error }]}>
                  {metrics?.pendingVerifications || 0}
                </Text>
                <Text style={styles.metricLbl}>Pending Reviews</Text>
              </View>
            </View>

            <Card style={styles.configCard}>
              <View style={styles.configHeader}>
                <IconWell name="settings-outline" size={40} iconSize={20} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.configTitle}>Platform Configuration</Text>
                  <Text style={styles.configSub}>Standard parameters for East Africa dispatch</Text>
                </View>
              </View>

              <View style={styles.configDivider} />

              <View style={styles.configItemRow}>
                <IconWell name="location-sharp" size={28} iconSize={14} />
                <Text style={styles.configLabel}>Markets</Text>
                <Text style={styles.configValue}>
                  {config?.coverageDistricts?.length || 0} coverage districts in {COUNTRY_LIST.length}{' '}
                  countries
                </Text>
              </View>

              <View style={styles.configItemRow}>
                <IconWell name="car-outline" size={28} iconSize={14} />
                <Text style={styles.configLabel}>Travel Fee</Text>
                <Text style={styles.configValue}>
                  {formatMoney(config?.baseTravelFee || 0, config?.defaultCurrency || 'RWF')} base travel
                  fee
                </Text>
              </View>

              <View style={styles.configItemRow}>
                <IconWell
                  name="call-outline"
                  size={28}
                  iconSize={14}
                  color={THEME.colors.error}
                  backgroundColor={THEME.colors.errorSoft}
                />
                <Text style={styles.configLabel}>Emergency</Text>
                <Text style={[styles.configValue, { color: THEME.colors.error }]}>
                  {Object.entries(config?.emergencyPhones || {})
                    .map(([code, phone]) => `${code} ${phone}`)
                    .join(' · ') || 'Not configured'}
                </Text>
              </View>

              <View style={styles.configItemRow}>
                <IconWell name="shield-checkmark-outline" size={28} iconSize={14} />
                <Text style={styles.configLabel}>Authorities</Text>
                <Text style={styles.configValue}>
                  {COUNTRY_LIST.map((c) => c.regulatorShort).join(' · ')}
                </Text>
              </View>
            </Card>
          </View>
        )}

        {activeTab === 'doctors' && (
          <View style={styles.tabContent}>
            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
                <Pressable
                  style={[styles.filterChip, doctorFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setDoctorFilter('all')}
                >
                  <Ionicons name="people-outline" size={14} color={doctorFilter === 'all' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.filterChipText, doctorFilter === 'all' && styles.filterChipTextActive]}>
                    All ({doctors.length})
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.filterChip, doctorFilter === 'pending' && styles.filterChipActiveWarning]}
                  onPress={() => setDoctorFilter('pending')}
                >
                  <Ionicons name="time-outline" size={14} color={THEME.colors.warning} />
                  <Text style={[styles.filterChipText, doctorFilter === 'pending' && styles.filterChipTextActiveWarning]}>
                    Pending ({pendingDoctorsCount})
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.filterChip, doctorFilter === 'approved' && styles.filterChipActiveSuccess]}
                  onPress={() => setDoctorFilter('approved')}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color={THEME.colors.success} />
                  <Text style={[styles.filterChipText, doctorFilter === 'approved' && styles.filterChipTextActiveSuccess]}>
                    Approved ({approvedDoctorsCount})
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.filterChip, doctorFilter === 'suspended' && styles.filterChipActiveDanger]}
                  onPress={() => setDoctorFilter('suspended')}
                >
                  <Ionicons name="ban-outline" size={14} color={THEME.colors.error} />
                  <Text style={[styles.filterChipText, doctorFilter === 'suspended' && styles.filterChipTextActiveDanger]}>
                    Suspended ({suspendedDoctorsCount})
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {filteredDoctors.length === 0 ? (
              <Card style={styles.emptyCard}>
                <IconWell name="search-outline" size={48} iconSize={24} color={THEME.colors.textMuted} backgroundColor={THEME.colors.surfaceSubtle} />
                <Text style={styles.emptyTitle}>No doctors match this filter</Text>
                <Text style={styles.emptyText}>Switch filters to view registered clinicians.</Text>
              </Card>
            ) : (
              filteredDoctors.map((d) => (
                <Card key={d.userId} style={styles.docCard}>
                  <View style={styles.docHeader}>
                    {d.avatarUrl ? (
                      <Image source={{ uri: d.avatarUrl }} style={styles.docAvatar} />
                    ) : (
                      <IconWell name="medkit-outline" size={44} iconSize={20} />
                    )}

                    <View style={styles.docMainInfo}>
                      <View style={styles.docNameBadgeRow}>
                        <View style={styles.docNameRow}>
                          <Text style={styles.docName} numberOfLines={1}>{d.name}</Text>
                          {d.verificationStatus === 'approved' && (
                            <Ionicons name="checkmark-circle" size={16} color={THEME.colors.primary} />
                          )}
                        </View>
                        <Badge status={d.verificationStatus} size="sm" />
                      </View>
                      <Text style={styles.docSpecialty}>{d.specialty}</Text>
                      <View style={styles.docMetaItem}>
                        <Ionicons name="ribbon-outline" size={13} color={THEME.colors.primary} />
                        <Text style={styles.licenseNumberText}>{d.licenseNumber}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.docDivider} />

                  <View style={styles.docDetailsGrid}>
                    <View style={styles.docDetailRow}>
                      <Ionicons name="mail-outline" size={14} color={THEME.colors.textMuted} />
                      <Text style={styles.docDetailText}>{d.email}</Text>
                    </View>
                    <View style={styles.docDetailRow}>
                      <Ionicons name="call-outline" size={14} color={THEME.colors.textMuted} />
                      <Text style={styles.docDetailText}>{d.phone}</Text>
                    </View>
                    <View style={styles.docDetailRow}>
                      <Ionicons name="school-outline" size={14} color={THEME.colors.textMuted} />
                      <Text style={styles.docDetailText}>
                        {d.qualifications.join(', ')} ({d.experienceYears} yrs)
                      </Text>
                    </View>
                    <View style={styles.districtChipsRow}>
                      {d.coverageDistricts.map((district) => (
                        <View key={district} style={styles.districtChip}>
                          <Ionicons name="location-sharp" size={12} color={THEME.colors.primary} />
                          <Text style={styles.districtText}>{district}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.docDetailRow}>
                      <Ionicons name="pricetag-outline" size={14} color={THEME.colors.textMuted} />
                      <Text style={styles.docDetailText}>
                        {formatMoney(d.consultationFeeRwf, d.currency)} +{' '}
                        {formatMoney(d.travelFeeRwf, d.currency)} travel
                      </Text>
                    </View>
                  </View>

                  <View style={styles.docActions}>
                    {d.verificationStatus !== 'approved' && (
                      <Pressable
                        style={[styles.docActionBtn, styles.approveBtn]}
                        onPress={() => handleUpdateDoctorStatus(d.userId, 'approved')}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                        <Text style={styles.docActionBtnTextWhite}>Approve</Text>
                      </Pressable>
                    )}
                    {d.verificationStatus !== 'suspended' && (
                      <Pressable
                        style={[styles.docActionBtn, styles.suspendBtn]}
                        onPress={() => handleUpdateDoctorStatus(d.userId, 'suspended')}
                      >
                        <Ionicons name="ban-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.docActionBtnTextWhite}>Suspend</Text>
                      </Pressable>
                    )}
                    {d.verificationStatus !== 'pending' && (
                      <Pressable
                        style={[styles.docActionBtn, styles.pendingBtn]}
                        onPress={() => handleUpdateDoctorStatus(d.userId, 'pending')}
                      >
                        <Ionicons name="time-outline" size={16} color={THEME.colors.primary} />
                        <Text style={styles.docActionBtnTextTeal}>Mark Pending</Text>
                      </Pressable>
                    )}
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'complaints' && (
          <View style={styles.tabContent}>
            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
                <Pressable
                  style={[styles.filterChip, complaintFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setComplaintFilter('all')}
                >
                  <Ionicons name="layers-outline" size={14} color={complaintFilter === 'all' ? THEME.colors.primary : THEME.colors.textMuted} />
                  <Text style={[styles.filterChipText, complaintFilter === 'all' && styles.filterChipTextActive]}>
                    All ({complaints.length})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, complaintFilter === 'open' && styles.filterChipActiveWarning]}
                  onPress={() => setComplaintFilter('open')}
                >
                  <Ionicons name="alert-circle-outline" size={14} color={THEME.colors.warning} />
                  <Text style={[styles.filterChipText, complaintFilter === 'open' && styles.filterChipTextActiveWarning]}>
                    Open ({pendingComplaintsCount})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, complaintFilter === 'resolved' && styles.filterChipActiveSuccess]}
                  onPress={() => setComplaintFilter('resolved')}
                >
                  <Ionicons name="checkmark-done-outline" size={14} color={THEME.colors.success} />
                  <Text style={[styles.filterChipText, complaintFilter === 'resolved' && styles.filterChipTextActiveSuccess]}>
                    Resolved ({complaints.length - pendingComplaintsCount})
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {filteredComplaints.length === 0 ? (
              <Card style={styles.emptyCard}>
                <IconWell name="checkmark-circle-outline" size={48} iconSize={26} color={THEME.colors.success} backgroundColor={THEME.colors.successSoft} />
                <Text style={styles.emptyTitle}>No complaints reported</Text>
                <Text style={styles.emptyText}>All patient consultations are currently free of grievances.</Text>
              </Card>
            ) : (
              filteredComplaints.map((c) => (
                <Card key={c.id} style={styles.complaintCard}>
                  <View style={styles.complaintHeader}>
                    <View style={styles.complaintTitleCol}>
                      <IconWell
                        name="chatbox-ellipses-outline"
                        size={32}
                        iconSize={16}
                        color={THEME.colors.warning}
                        backgroundColor={THEME.colors.warningSoft}
                      />
                      <Text style={styles.complaintSubject}>{c.subject}</Text>
                    </View>
                    <Badge status={c.status === 'resolved' ? 'completed' : 'pending'} size="sm" />
                  </View>

                  <View style={styles.complaintQuoteBox}>
                    <Text style={styles.complaintDetails}>&quot;{c.details}&quot;</Text>
                  </View>

                  <View style={styles.complaintMetaGrid}>
                    <View style={styles.complaintMetaItem}>
                      <Ionicons name="receipt-outline" size={13} color={THEME.colors.textMuted} />
                      <Text style={styles.complaintMetaText}>
                        {c.visitId ? `Visit #${c.visitId.slice(0, 8)}` : 'No visit linked'}
                      </Text>
                    </View>
                    <View style={styles.complaintMetaItem}>
                      <Ionicons name="calendar-outline" size={13} color={THEME.colors.textMuted} />
                      <Text style={styles.complaintMetaText}>{c.createdAt.split('T')[0]}</Text>
                    </View>
                    <View style={styles.complaintMetaItem}>
                      <Ionicons name="person-outline" size={13} color={THEME.colors.textMuted} />
                      <Text style={styles.complaintMetaText}>{c.reporterRole}</Text>
                    </View>
                  </View>

                  {c.resolutionNotes ? (
                    <View style={styles.resolutionBox}>
                      <Ionicons name="checkmark-circle" size={15} color={THEME.colors.success} />
                      <Text style={styles.resolutionNotes}>{c.resolutionNotes}</Text>
                    </View>
                  ) : (
                    <Pressable style={styles.resolveComplaintBtn} onPress={() => handleResolveComplaint(c.id)}>
                      <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.resolveComplaintBtnText}>Resolve Complaint</Text>
                    </Pressable>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'audit' && (
          <View style={styles.tabContent}>
            <Card style={styles.auditDisclaimer}>
              <View style={styles.disclaimerRow}>
                <IconWell name="lock-closed-outline" size={36} iconSize={18} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditDisclaimerTitle}>Law No. 058/2021 Compliance</Text>
                  <Text style={styles.auditDisclaimerText}>
                    Mandatory audit logs for clinical notes, prescriptions, lab orders, and record access.
                  </Text>
                </View>
              </View>
            </Card>

            {auditLogs.map((log) => {
              const isCreate = log.action === 'CREATE' || log.action === 'PUBLISH';
              return (
                <Card key={log.id} style={styles.auditCard}>
                  <View style={styles.auditTopRow}>
                    <View style={styles.auditActionBadge}>
                      <IconWell
                        name={isCreate ? 'add-circle-outline' : 'eye-outline'}
                        size={28}
                        iconSize={14}
                      />
                      <Text style={styles.auditActionText}>{log.action}</Text>
                      <Text style={styles.auditEntityText}>{log.entityType}</Text>
                    </View>
                    <View style={styles.auditTimeRow}>
                      <Ionicons name="time-outline" size={12} color={THEME.colors.textMuted} />
                      <Text style={styles.auditTime}>{log.timestamp.replace('T', ' ').slice(0, 19)}</Text>
                    </View>
                  </View>

                  <Text style={styles.auditDetailsText}>{log.details}</Text>

                  <View style={styles.auditFooterRow}>
                    <View style={styles.auditActorBadge}>
                      <Ionicons name="person-circle-outline" size={16} color={THEME.colors.textSecondary} />
                      <Text style={styles.auditActorText}>
                        {log.actorName} ({log.actorRole})
                      </Text>
                    </View>
                    <View style={styles.hashBadge}>
                      <Ionicons name="finger-print-outline" size={13} color={THEME.colors.primary} />
                      <Text style={styles.hashText}>Verified</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <View style={styles.emergencyFooter}>
          <Ionicons name="information-circle-outline" size={14} color={THEME.colors.textMuted} />
          <Text style={styles.emergencyFooterText}>
            Medical emergency? Call your national number:{' '}
            <Text style={styles.emergencyNumber}>112 (RW/TZ) · 999 (KE/UG/SS) · 117 (BI)</Text>
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
  iconWell: {
    alignItems: 'center',
    justifyContent: 'center',
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
  brandActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  header: {
    paddingHorizontal: THEME.spacing.base,
    paddingTop: 2,
    paddingBottom: THEME.spacing.sm,
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
  locationText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  summaryBar: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.base,
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  summaryChip: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 4,
  },
  summaryChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  summaryNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  summaryTextActive: {
    color: THEME.colors.textWhite,
  },
  tabContainer: {
    marginBottom: THEME.spacing.md,
  },
  tabScrollContent: {
    paddingHorizontal: THEME.spacing.base,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabPillActive: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: THEME.colors.primaryLight,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabLabelActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: THEME.colors.surface,
  },
  tabBadgeWarn: {
    backgroundColor: THEME.colors.warningSoft,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: THEME.colors.primary,
  },
  tabBadgeTextWarn: {
    color: THEME.colors.warning,
  },
  tabContent: {
    paddingHorizontal: THEME.spacing.base,
    marginBottom: THEME.spacing.md,
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: THEME.spacing.base,
  },
  metricCard: {
    width: '48%',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    alignItems: 'flex-start',
    ...THEME.shadows.card,
  },
  metricCardAlert: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF8F8',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 10,
  },
  metricLbl: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 10,
  },
  maxRatingText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  configCard: {
    padding: 14,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  configTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  configSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  configDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: 12,
  },
  configItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    width: 78,
  },
  configValue: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 12,
    marginHorizontal: -THEME.spacing.base,
  },
  filterScrollContent: {
    paddingHorizontal: THEME.spacing.base,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: THEME.colors.primaryLight,
  },
  filterChipActiveWarning: {
    backgroundColor: THEME.colors.warningSoft,
    borderColor: '#FDE68A',
  },
  filterChipActiveSuccess: {
    backgroundColor: THEME.colors.successSoft,
    borderColor: '#BBF7D0',
  },
  filterChipActiveDanger: {
    backgroundColor: THEME.colors.errorSoft,
    borderColor: '#FECACA',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  filterChipTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  filterChipTextActiveWarning: {
    color: THEME.colors.badgePendingText,
    fontWeight: '700',
  },
  filterChipTextActiveSuccess: {
    color: THEME.colors.badgeCompletedText,
    fontWeight: '700',
  },
  filterChipTextActiveDanger: {
    color: THEME.colors.badgeCancelledText,
    fontWeight: '700',
  },
  docCard: {
    marginBottom: 12,
    padding: 14,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  docAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primarySoft,
  },
  docMainInfo: {
    flex: 1,
  },
  docNameBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  docNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    paddingRight: 6,
  },
  docName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    flexShrink: 1,
  },
  docMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  docSpecialty: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  licenseNumberText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  docDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: 10,
  },
  docDetailsGrid: {
    gap: 8,
    marginBottom: 12,
  },
  docDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docDetailText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  districtChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  districtChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: THEME.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.full,
  },
  districtText: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  docActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  docActionBtn: {
    flex: 1,
    minWidth: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: THEME.borderRadius.sm,
  },
  approveBtn: {
    backgroundColor: THEME.colors.primary,
  },
  suspendBtn: {
    backgroundColor: THEME.colors.error,
  },
  pendingBtn: {
    backgroundColor: THEME.colors.primarySoft,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  docActionBtnTextWhite: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  docActionBtnTextTeal: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  complaintCard: {
    marginBottom: 12,
    padding: 14,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  complaintTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 6,
  },
  complaintSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  complaintQuoteBox: {
    backgroundColor: THEME.colors.background,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.warning,
    marginBottom: 10,
  },
  complaintDetails: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  complaintMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  complaintMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  complaintMetaText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  resolutionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.successSoft,
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  resolutionNotes: {
    fontSize: 11,
    color: THEME.colors.badgeCompletedText,
    fontWeight: '600',
    flex: 1,
  },
  resolveComplaintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.sm,
    marginTop: 6,
  },
  resolveComplaintBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  auditDisclaimer: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: '#99F6E4',
    marginBottom: 12,
    padding: 12,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  auditDisclaimerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
    marginBottom: 2,
  },
  auditDisclaimerText: {
    fontSize: 12,
    color: THEME.colors.primaryDark,
    lineHeight: 16,
  },
  auditCard: {
    marginBottom: 8,
    padding: 12,
  },
  auditTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  auditActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  auditActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  auditEntityText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  auditTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  auditTime: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  auditDetailsText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  auditFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  auditActorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  auditActorText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  hashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hashText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  emergencyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
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
  fullResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: THEME.spacing.base,
    marginTop: 16,
    backgroundColor: THEME.colors.primarySoft,
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
  },
  fullResetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});
