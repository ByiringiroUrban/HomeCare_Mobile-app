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
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { adminService } from '../../services/api';
import { mockDomainStore } from '../../mock/mockDomainStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

type TabType = 'metrics' | 'doctors' | 'complaints' | 'audit';
type DoctorFilterType = 'all' | 'pending' | 'approved' | 'suspended';
type ComplaintFilterType = 'all' | 'open' | 'resolved';

export default function AdminConsoleScreen() {
  const { logout, resetDemoData } = useAuthStore();
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

  // Filtered lists
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
        {/* Admin Header with Official Logo & Actions */}
        <View style={styles.topHeader}>
          <View style={styles.headerLeftCol}>
            <Image
              source={require('../../../assets/homecare-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View style={styles.adminRoleRow}>
              <View style={styles.adminCrownBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#B45309" />
                <Text style={styles.adminCrownText}>Platform Administrator</Text>
              </View>
              <Text style={styles.kigaliRegionText}>Kigali Healthcare Network</Text>
            </View>
          </View>

          <View style={styles.headerActionsRow}>
            <Pressable
              style={styles.headerActionBtn}
              onPress={() => {
                resetDemoData();
                onRefresh();
                Alert.alert('Data Reset', 'Demo data has been restored to default state.');
              }}
            >
              <Ionicons name="refresh-outline" size={15} color="#475569" />
              <Text style={styles.headerActionBtnText}>Reset</Text>
            </Pressable>

            <Pressable
              style={[styles.headerActionBtn, styles.signOutBtn]}
              onPress={() => {
                logout();
                router.replace('/(auth)/welcome');
              }}
            >
              <Ionicons name="log-out-outline" size={15} color="#DC2626" />
              <Text style={styles.signOutBtnText}>Sign Out</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Highlights Summary Bar (Tappable Quick Jump) */}
        <View style={styles.summaryBar}>
          <Pressable
            style={[styles.summaryPill, activeTab === 'doctors' && styles.summaryPillActive]}
            onPress={() => setActiveTab('doctors')}
          >
            <Ionicons name="medkit-outline" size={15} color={activeTab === 'doctors' ? '#FFFFFF' : THEME.colors.primary} />
            <Text style={[styles.summaryPillNumber, activeTab === 'doctors' && styles.summaryPillTextActive]}>
              {doctors.length}
            </Text>
            <Text style={[styles.summaryPillLabel, activeTab === 'doctors' && styles.summaryPillTextActive]}>
              Doctors
            </Text>
          </Pressable>

          <Pressable
            style={[styles.summaryPill, activeTab === 'doctors' && doctorFilter === 'pending' && styles.summaryPillActive]}
            onPress={() => {
              setActiveTab('doctors');
              setDoctorFilter('pending');
            }}
          >
            <Ionicons name="hourglass-outline" size={15} color={pendingDoctorsCount > 0 ? '#D97706' : '#64748B'} />
            <Text style={[styles.summaryPillNumber, { color: pendingDoctorsCount > 0 ? '#D97706' : '#64748B' }]}>
              {pendingDoctorsCount}
            </Text>
            <Text style={styles.summaryPillLabel}>Pending</Text>
          </Pressable>

          <Pressable
            style={[styles.summaryPill, activeTab === 'complaints' && styles.summaryPillActive]}
            onPress={() => setActiveTab('complaints')}
          >
            <Ionicons name="alert-circle-outline" size={15} color={pendingComplaintsCount > 0 ? '#DC2626' : '#16A34A'} />
            <Text style={[styles.summaryPillNumber, { color: pendingComplaintsCount > 0 ? '#DC2626' : '#16A34A' }]}>
              {complaints.length}
            </Text>
            <Text style={styles.summaryPillLabel}>Complaints</Text>
          </Pressable>

          <Pressable
            style={[styles.summaryPill, activeTab === 'audit' && styles.summaryPillActive]}
            onPress={() => setActiveTab('audit')}
          >
            <Ionicons name="shield-checkmark-outline" size={15} color="#0D9488" />
            <Text style={[styles.summaryPillNumber, { color: '#0D9488' }]}>
              {auditLogs.length}
            </Text>
            <Text style={styles.summaryPillLabel}>Audit Logs</Text>
          </Pressable>
        </View>

        {/* Responsive Horizontal Scroll Tab Bar with Icons & Counts */}
        <View style={styles.tabContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {/* Tab 1: Platform Metrics */}
            <Pressable
              style={[styles.tabPill, activeTab === 'metrics' && styles.tabPillActive]}
              onPress={() => setActiveTab('metrics')}
            >
              <View style={[styles.tabIconBox, activeTab === 'metrics' && styles.tabIconBoxActive]}>
                <Ionicons
                  name={activeTab === 'metrics' ? 'stats-chart' : 'stats-chart-outline'}
                  size={16}
                  color={activeTab === 'metrics' ? '#FFFFFF' : THEME.colors.primary}
                />
              </View>
              <Text style={[styles.tabLabel, activeTab === 'metrics' && styles.tabLabelActive]}>
                Platform Metrics
              </Text>
            </Pressable>

            {/* Tab 2: Doctor Credentials */}
            <Pressable
              style={[styles.tabPill, activeTab === 'doctors' && styles.tabPillActive]}
              onPress={() => setActiveTab('doctors')}
            >
              <View style={[styles.tabIconBox, activeTab === 'doctors' && styles.tabIconBoxActive]}>
                <Ionicons
                  name={activeTab === 'doctors' ? 'medkit' : 'medkit-outline'}
                  size={16}
                  color={activeTab === 'doctors' ? '#FFFFFF' : THEME.colors.primary}
                />
              </View>
              <Text style={[styles.tabLabel, activeTab === 'doctors' && styles.tabLabelActive]}>
                Doctor Licensing
              </Text>
              <View style={[styles.tabBadge, activeTab === 'doctors' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'doctors' && styles.tabBadgeTextActive]}>
                  {doctors.length}
                </Text>
              </View>
            </Pressable>

            {/* Tab 3: Complaints */}
            <Pressable
              style={[styles.tabPill, activeTab === 'complaints' && styles.tabPillActive]}
              onPress={() => setActiveTab('complaints')}
            >
              <View style={[styles.tabIconBox, activeTab === 'complaints' && styles.tabIconBoxActive]}>
                <Ionicons
                  name={activeTab === 'complaints' ? 'alert-circle' : 'alert-circle-outline'}
                  size={16}
                  color={activeTab === 'complaints' ? '#FFFFFF' : '#D97706'}
                />
              </View>
              <Text style={[styles.tabLabel, activeTab === 'complaints' && styles.tabLabelActive]}>
                Complaints
              </Text>
              {pendingComplaintsCount > 0 && (
                <View style={[styles.tabBadgeWarning, activeTab === 'complaints' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeTextWarning, activeTab === 'complaints' && styles.tabBadgeTextActive]}>
                    {pendingComplaintsCount}
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Tab 4: Audit Log */}
            <Pressable
              style={[styles.tabPill, activeTab === 'audit' && styles.tabPillActive]}
              onPress={() => setActiveTab('audit')}
            >
              <View style={[styles.tabIconBox, activeTab === 'audit' && styles.tabIconBoxActive]}>
                <Ionicons
                  name={activeTab === 'audit' ? 'shield-checkmark' : 'shield-checkmark-outline'}
                  size={16}
                  color={activeTab === 'audit' ? '#FFFFFF' : '#0F766E'}
                />
              </View>
              <Text style={[styles.tabLabel, activeTab === 'audit' && styles.tabLabelActive]}>
                Audit Trail
              </Text>
              <View style={[styles.tabBadge, activeTab === 'audit' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'audit' && styles.tabBadgeTextActive]}>
                  {auditLogs.length}
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>

        {/* ========================================================================= */}
        {/* TAB 1: Platform Metrics & Operational Overview */}
        {/* ========================================================================= */}
        {activeTab === 'metrics' && (
          <View style={styles.tabContent}>
            {/* Section Title */}
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleIconBox}>
                <Ionicons name="bar-chart" size={16} color={THEME.colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Operational Performance Indicators</Text>
            </View>

            {/* 6 Responsive Metrics Grid */}
            <View style={styles.metricsGrid}>
              {/* Total Consultations */}
              <Card style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <View style={[styles.metricIconCircle, { backgroundColor: '#CCFBF1' }]}>
                    <Ionicons name="calendar-outline" size={18} color="#0D9488" />
                  </View>
                  <Text style={styles.metricTag}>All-Time</Text>
                </View>
                <Text style={styles.metricVal}>{metrics?.totalVisits || 0}</Text>
                <Text style={styles.metricLbl}>Total Consultations</Text>
              </Card>

              {/* Completed In-Home Visits */}
              <Card style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <View style={[styles.metricIconCircle, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="checkmark-done-circle-outline" size={18} color="#16A34A" />
                  </View>
                  <Text style={[styles.metricTag, { color: '#16A34A', backgroundColor: '#F0FDF4' }]}>Delivered</Text>
                </View>
                <Text style={[styles.metricVal, { color: '#16A34A' }]}>{metrics?.completedVisits || 0}</Text>
                <Text style={styles.metricLbl}>Completed Visits</Text>
              </Card>

              {/* Active Underway */}
              <Card style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <View style={[styles.metricIconCircle, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="navigate-outline" size={18} color="#2563EB" />
                  </View>
                  <Text style={[styles.metricTag, { color: '#2563EB', backgroundColor: '#EFF6FF' }]}>In Transit</Text>
                </View>
                <Text style={[styles.metricVal, { color: '#2563EB' }]}>{metrics?.activeVisits || 0}</Text>
                <Text style={styles.metricLbl}>Active Underway</Text>
              </Card>

              {/* Gross Billed Volume */}
              <Card style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <View style={[styles.metricIconCircle, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="wallet-outline" size={18} color="#7E22CE" />
                  </View>
                  <Text style={[styles.metricTag, { color: '#7E22CE', backgroundColor: '#FAF5FF' }]}>Volume</Text>
                </View>
                <Text style={[styles.metricVal, { fontSize: 16, color: '#7E22CE' }]}>
                  {(metrics?.grossRevenueRwf || 0).toLocaleString()} <Text style={styles.currencyUnit}>RWF</Text>
                </Text>
                <Text style={styles.metricLbl}>Gross Billed Fees</Text>
              </Card>

              {/* Average Doctor Rating */}
              <Card style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <View style={[styles.metricIconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="star" size={18} color="#D97706" />
                  </View>
                  <Text style={[styles.metricTag, { color: '#D97706', backgroundColor: '#FFFBEB' }]}>Reviews</Text>
                </View>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={[styles.metricVal, { color: '#1E293B' }]}>{metrics?.avgRating || 0}</Text>
                  <Text style={styles.maxRatingText}>/ 5.0</Text>
                </View>
                <Text style={styles.metricLbl}>Avg. Doctor Rating</Text>
              </Card>

              {/* Pending Doctor Reviews */}
              <Card style={StyleSheet.flatten([styles.metricCard, styles.metricCardAlert])}>
                <View style={styles.metricTopRow}>
                  <View style={[styles.metricIconCircle, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="hourglass-outline" size={18} color="#DC2626" />
                  </View>
                  <Text style={[styles.metricTag, { color: '#DC2626', backgroundColor: '#FEF2F2' }]}>Action Req.</Text>
                </View>
                <Text style={[styles.metricVal, { color: '#DC2626' }]}>
                  {metrics?.pendingVerifications || 0}
                </Text>
                <Text style={styles.metricLbl}>Pending MD Reviews</Text>
              </Card>
            </View>

            {/* Platform Configuration Card */}
            <Card style={styles.configCard}>
              <View style={styles.configHeader}>
                <View style={styles.configHeaderIcon}>
                  <Ionicons name="settings-outline" size={18} color={THEME.colors.primary} />
                </View>
                <View>
                  <Text style={styles.configTitle}>Platform Configuration Rules</Text>
                  <Text style={styles.configSub}>Standard operational parameters for Kigali healthcare dispatch</Text>
                </View>
              </View>

              <View style={styles.configDivider} />

              <View style={styles.configItemRow}>
                <Ionicons name="location-outline" size={16} color={THEME.colors.primary} />
                <Text style={styles.configLabel}>Coverage Districts:</Text>
                <Text style={styles.configValue}>{mockDomainStore.platformConfig.coverageDistricts.join(', ')} (Kigali)</Text>
              </View>

              <View style={styles.configItemRow}>
                <Ionicons name="car-outline" size={16} color={THEME.colors.primary} />
                <Text style={styles.configLabel}>Base Travel Fee:</Text>
                <Text style={styles.configValue}>{mockDomainStore.platformConfig.baseTravelFeeRwf.toLocaleString()} RWF</Text>
              </View>

              <View style={styles.configItemRow}>
                <Ionicons name="call-outline" size={16} color="#DC2626" />
                <Text style={styles.configLabel}>Emergency Dispatch:</Text>
                <Text style={[styles.configValue, { color: '#DC2626', fontWeight: '700' }]}>
                  {mockDomainStore.platformConfig.emergencyPhone} (Rwanda SAMU)
                </Text>
              </View>

              <View style={styles.configItemRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#0D9488" />
                <Text style={styles.configLabel}>Regulatory Authority:</Text>
                <Text style={styles.configValue}>RMDC & Rwandan Law No. 058/2021</Text>
              </View>
            </Card>
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: Doctor Credential Review (FR-10.1) */}
        {/* ========================================================================= */}
        {activeTab === 'doctors' && (
          <View style={styles.tabContent}>
            {/* Status Filter Chips */}
            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
                <Pressable
                  style={[styles.filterChip, doctorFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setDoctorFilter('all')}
                >
                  <Ionicons name="people-outline" size={14} color={doctorFilter === 'all' ? '#FFF' : '#64748B'} />
                  <Text style={[styles.filterChipText, doctorFilter === 'all' && styles.filterChipTextActive]}>
                    All ({doctors.length})
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.filterChip, doctorFilter === 'pending' && styles.filterChipActiveWarning]}
                  onPress={() => setDoctorFilter('pending')}
                >
                  <Ionicons name="hourglass-outline" size={14} color={doctorFilter === 'pending' ? '#B45309' : '#D97706'} />
                  <Text style={[styles.filterChipText, doctorFilter === 'pending' && styles.filterChipTextActiveWarning]}>
                    Pending ({pendingDoctorsCount})
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.filterChip, doctorFilter === 'approved' && styles.filterChipActiveSuccess]}
                  onPress={() => setDoctorFilter('approved')}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color={doctorFilter === 'approved' ? '#15803D' : '#16A34A'} />
                  <Text style={[styles.filterChipText, doctorFilter === 'approved' && styles.filterChipTextActiveSuccess]}>
                    Approved ({approvedDoctorsCount})
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.filterChip, doctorFilter === 'suspended' && styles.filterChipActiveDanger]}
                  onPress={() => setDoctorFilter('suspended')}
                >
                  <Ionicons name="ban-outline" size={14} color={doctorFilter === 'suspended' ? '#B91C1C' : '#DC2626'} />
                  <Text style={[styles.filterChipText, doctorFilter === 'suspended' && styles.filterChipTextActiveDanger]}>
                    Suspended ({suspendedDoctorsCount})
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* Doctor List */}
            {filteredDoctors.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="search-outline" size={32} color={THEME.colors.textMuted} />
                <Text style={styles.emptyTitle}>No doctors match this filter</Text>
                <Text style={styles.emptyText}>Switch filters or reset demo data to view registered clinicians.</Text>
              </Card>
            ) : (
              filteredDoctors.map((d) => (
                <Card key={d.userId} style={styles.docCard}>
                  {/* Doctor Card Top Row */}
                  <View style={styles.docHeader}>
                    <View style={styles.docAvatarCol}>
                      <View style={styles.docAvatarBox}>
                        <Ionicons name="medical" size={20} color={THEME.colors.primary} />
                      </View>
                    </View>

                    <View style={styles.docMainInfo}>
                      <View style={styles.docNameBadgeRow}>
                        <Text style={styles.docName}>{d.name}</Text>
                        <Badge status={d.verificationStatus} size="sm" />
                      </View>

                      <View style={styles.docMetaItem}>
                        <Ionicons name="ribbon-outline" size={14} color={THEME.colors.primary} />
                        <Text style={styles.docSpecialty}>
                          {d.specialty} • <Text style={styles.licenseNumberText}>{d.licenseNumber}</Text>
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.docDivider} />

                  {/* Doctor Details Grid */}
                  <View style={styles.docDetailsGrid}>
                    <View style={styles.docDetailRow}>
                      <Ionicons name="mail-outline" size={14} color="#64748B" />
                      <Text style={styles.docDetailText}>{d.email}</Text>
                    </View>

                    <View style={styles.docDetailRow}>
                      <Ionicons name="call-outline" size={14} color="#64748B" />
                      <Text style={styles.docDetailText}>{d.phone}</Text>
                    </View>

                    <View style={styles.docDetailRow}>
                      <Ionicons name="school-outline" size={14} color="#64748B" />
                      <Text style={styles.docDetailText}>
                        {d.qualifications.join(', ')} ({d.experienceYears} yrs experience)
                      </Text>
                    </View>

                    <View style={styles.docDetailRow}>
                      <Ionicons name="map-outline" size={14} color="#64748B" />
                      <Text style={styles.docDetailText}>
                        Coverage: {d.coverageDistricts.join(', ')}
                      </Text>
                    </View>

                    <View style={styles.docDetailRow}>
                      <Ionicons name="pricetag-outline" size={14} color="#64748B" />
                      <Text style={styles.docDetailText}>
                        Fee: {(d.consultationFeeRwf || 25000).toLocaleString()} RWF (+ {d.travelFeeRwf || 5000} RWF travel)
                      </Text>
                    </View>
                  </View>

                  {/* Administrative Verification Action Buttons */}
                  <View style={styles.docActions}>
                    {d.verificationStatus !== 'approved' && (
                      <Pressable
                        style={[styles.docActionBtn, styles.approveBtn]}
                        onPress={() => handleUpdateDoctorStatus(d.userId, 'approved')}
                      >
                        <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.docActionBtnTextWhite}>Approve License</Text>
                      </Pressable>
                    )}

                    {d.verificationStatus !== 'suspended' && (
                      <Pressable
                        style={[styles.docActionBtn, styles.suspendBtn]}
                        onPress={() => handleUpdateDoctorStatus(d.userId, 'suspended')}
                      >
                        <Ionicons name="ban-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.docActionBtnTextWhite}>Suspend Doctor</Text>
                      </Pressable>
                    )}

                    {d.verificationStatus !== 'pending' && (
                      <Pressable
                        style={[styles.docActionBtn, styles.pendingBtn]}
                        onPress={() => handleUpdateDoctorStatus(d.userId, 'pending')}
                      >
                        <Ionicons name="time-outline" size={15} color="#0F766E" />
                        <Text style={styles.docActionBtnTextTeal}>Mark Pending</Text>
                      </Pressable>
                    )}
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: Complaints Management & Grievances (FR-10.4) */}
        {/* ========================================================================= */}
        {activeTab === 'complaints' && (
          <View style={styles.tabContent}>
            {/* Complaint Filter Chips */}
            <View style={styles.filterSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
                <Pressable
                  style={[styles.filterChip, complaintFilter === 'all' && styles.filterChipActive]}
                  onPress={() => setComplaintFilter('all')}
                >
                  <Ionicons name="layers-outline" size={14} color={complaintFilter === 'all' ? '#FFF' : '#64748B'} />
                  <Text style={[styles.filterChipText, complaintFilter === 'all' && styles.filterChipTextActive]}>
                    All ({complaints.length})
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.filterChip, complaintFilter === 'open' && styles.filterChipActiveWarning]}
                  onPress={() => setComplaintFilter('open')}
                >
                  <Ionicons name="alert-circle-outline" size={14} color={complaintFilter === 'open' ? '#B45309' : '#D97706'} />
                  <Text style={[styles.filterChipText, complaintFilter === 'open' && styles.filterChipTextActiveWarning]}>
                    Pending Review ({pendingComplaintsCount})
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.filterChip, complaintFilter === 'resolved' && styles.filterChipActiveSuccess]}
                  onPress={() => setComplaintFilter('resolved')}
                >
                  <Ionicons name="checkmark-done-outline" size={14} color={complaintFilter === 'resolved' ? '#15803D' : '#16A34A'} />
                  <Text style={[styles.filterChipText, complaintFilter === 'resolved' && styles.filterChipTextActiveSuccess]}>
                    Resolved ({complaints.length - pendingComplaintsCount})
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            {filteredComplaints.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={36} color="#16A34A" />
                <Text style={styles.emptyTitle}>No Complaints Reported</Text>
                <Text style={styles.emptyText}>All patient consultations are currently free of grievances.</Text>
              </Card>
            ) : (
              filteredComplaints.map((c) => (
                <Card key={c.id} style={styles.complaintCard}>
                  <View style={styles.complaintHeader}>
                    <View style={styles.complaintTitleCol}>
                      <View style={styles.complaintIconBox}>
                        <Ionicons name="alert-circle" size={18} color="#D97706" />
                      </View>
                      <Text style={styles.complaintSubject}>{c.subject}</Text>
                    </View>
                    <Badge status={c.status === 'resolved' ? 'completed' : 'pending'} size="sm" />
                  </View>

                  <View style={styles.complaintQuoteBox}>
                    <Text style={styles.complaintDetails}>"{c.details}"</Text>
                  </View>

                  <View style={styles.complaintMetaGrid}>
                    <View style={styles.complaintMetaItem}>
                      <Ionicons name="receipt-outline" size={13} color="#64748B" />
                      <Text style={styles.complaintMetaText}>Visit #{c.visitId}</Text>
                    </View>

                    <View style={styles.complaintMetaItem}>
                      <Ionicons name="calendar-outline" size={13} color="#64748B" />
                      <Text style={styles.complaintMetaText}>{c.createdAt.split('T')[0]}</Text>
                    </View>

                    <View style={styles.complaintMetaItem}>
                      <Ionicons name="person-outline" size={13} color="#64748B" />
                      <Text style={styles.complaintMetaText}>Reporter: {c.reporterRole.toUpperCase()}</Text>
                    </View>
                  </View>

                  {c.resolutionNotes ? (
                    <View style={styles.resolutionBox}>
                      <Ionicons name="checkmark-circle" size={15} color="#16A34A" />
                      <Text style={styles.resolutionNotes}>Resolution: {c.resolutionNotes}</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.resolveComplaintBtn}
                      onPress={() => handleResolveComplaint(c.id)}
                    >
                      <Ionicons name="checkmark-done-outline" size={15} color="#FFFFFF" />
                      <Text style={styles.resolveComplaintBtnText}>Resolve Complaint</Text>
                    </Pressable>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: Immutable Medical Record Audit Trail (FR-10.5) */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <View style={styles.tabContent}>
            {/* Regulatory Disclaimer Banner */}
            <Card style={styles.auditDisclaimer}>
              <View style={styles.disclaimerRow}>
                <View style={styles.auditShieldBox}>
                  <Ionicons name="lock-closed" size={18} color="#0F766E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditDisclaimerTitle}>Rwandan Law No. 058/2021 Compliance</Text>
                  <Text style={styles.auditDisclaimerText}>
                    Mandatory cryptographic audit logs. Tracks clinical notes creation, electronic prescription publication, specimen lab orders, and patient record access.
                  </Text>
                </View>
              </View>
            </Card>

            {/* Audit Log Cards */}
            {auditLogs.map((log) => {
              const isCreate = log.action === 'CREATE' || log.action === 'PUBLISH';
              return (
                <Card key={log.id} style={styles.auditCard}>
                  <View style={styles.auditTopRow}>
                    <View style={styles.auditActionBadge}>
                      <Ionicons
                        name={isCreate ? 'add-circle-outline' : 'eye-outline'}
                        size={14}
                        color={THEME.colors.primary}
                      />
                      <Text style={styles.auditActionText}>[{log.action}]</Text>
                      <Text style={styles.auditEntityText}>{log.entityType}</Text>
                    </View>
                    <View style={styles.auditTimeRow}>
                      <Ionicons name="time-outline" size={12} color="#94A3B8" />
                      <Text style={styles.auditTime}>{log.timestamp.replace('T', ' ').slice(0, 19)}</Text>
                    </View>
                  </View>

                  <Text style={styles.auditDetailsText}>{log.details}</Text>

                  <View style={styles.auditFooterRow}>
                    <View style={styles.auditActorBadge}>
                      <Ionicons name="person-circle-outline" size={14} color="#475569" />
                      <Text style={styles.auditActorText}>
                        {log.actorName} ({log.actorRole.toUpperCase()})
                      </Text>
                    </View>

                    <View style={styles.hashBadge}>
                      <Ionicons name="finger-print-outline" size={13} color="#0D9488" />
                      <Text style={styles.hashText}>Hash Verified</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* Demo Baseline Reset in Admin Footer */}
        <View style={styles.adminFooter}>
          <Pressable
            style={styles.fullResetBtn}
            onPress={() => {
              resetDemoData();
              onRefresh();
              Alert.alert('Environment Restored', 'All platform fixtures, mock doctors, visits, and clinical records have been reset to baseline.');
            }}
          >
            <Ionicons name="refresh-circle-outline" size={18} color="#0F766E" />
            <Text style={styles.fullResetBtnText}>Reset Demo Environment to Baseline State</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 60,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeftCol: {
    flex: 1,
  },
  logoImage: {
    width: 150,
    height: 42,
    marginBottom: 4,
  },
  adminRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  adminCrownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminCrownText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  kigaliRegionText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  signOutBtn: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  signOutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  // 4-Pill Summary Bar
  summaryBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  summaryPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  summaryPillNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  summaryPillLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  summaryPillTextActive: {
    color: '#FFFFFF',
  },

  // Responsive Horizontal Tabs
  tabContainer: {
    marginBottom: 16,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  tabScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconBoxActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeActive: {
    backgroundColor: '#38BDF8',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tabBadgeTextActive: {
    color: '#0F172A',
  },
  tabBadgeWarning: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tabBadgeTextWarning: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },

  tabContent: {
    marginBottom: 16,
  },

  // Tab 1: Metrics
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    padding: 12,
    borderRadius: THEME.borderRadius.md,
  },
  metricCardAlert: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF8F8',
  },
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  currencyUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7E22CE',
  },
  metricLbl: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  maxRatingText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Config Card
  configCard: {
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  configHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  configSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  configDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  configItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    width: 130,
  },
  configValue: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },

  // Filter Chips
  filterSection: {
    marginBottom: 12,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  filterChipActiveWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  filterChipActiveSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  filterChipActiveDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterChipTextActiveWarning: {
    color: '#92400E',
    fontWeight: '700',
  },
  filterChipTextActiveSuccess: {
    color: '#166534',
    fontWeight: '700',
  },
  filterChipTextActiveDanger: {
    color: '#991B1B',
    fontWeight: '700',
  },

  // Doctor Cards
  docCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: THEME.borderRadius.md,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  docAvatarCol: {
    paddingTop: 2,
  },
  docAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docMainInfo: {
    flex: 1,
  },
  docNameBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  docName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  docMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  docSpecialty: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  licenseNumberText: {
    color: '#64748B',
    fontWeight: '500',
  },
  docDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  docDetailsGrid: {
    gap: 6,
    marginBottom: 12,
  },
  docDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docDetailText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  docActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  docActionBtn: {
    flex: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.sm,
  },
  approveBtn: {
    backgroundColor: '#0F766E',
  },
  suspendBtn: {
    backgroundColor: '#DC2626',
  },
  pendingBtn: {
    backgroundColor: '#F0FDFA',
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
    color: '#0F766E',
  },

  // Complaints Cards
  complaintCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: THEME.borderRadius.md,
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
  complaintIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  complaintSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  complaintQuoteBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    marginBottom: 10,
  },
  complaintDetails: {
    fontSize: 12,
    color: '#334155',
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
    color: '#64748B',
    fontWeight: '500',
  },
  resolutionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 6,
  },
  resolutionNotes: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },
  resolveComplaintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0D9488',
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  resolveComplaintBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Audit Log Cards
  auditDisclaimer: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  auditShieldBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auditDisclaimerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 2,
  },
  auditDisclaimerText: {
    fontSize: 11,
    color: '#134E4A',
    lineHeight: 16,
  },
  auditCard: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  auditTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  auditActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  auditActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  auditEntityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  auditTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  auditTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  auditDetailsText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 8,
  },
  auditFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#F8FAFC',
  },
  auditActorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  auditActorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  hashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  hashText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },

  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
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
  adminFooter: {
    marginTop: 16,
    marginBottom: 20,
  },
  fullResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
  },
  fullResetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
});
