// Administration Console (SRS Section 9 & FR-10.1, FR-10.2, FR-10.3, FR-10.4, FR-10.5)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { adminService } from '../../services/api';
import { mockDomainStore } from '../../mock/mockDomainStore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function AdminConsoleScreen() {
  const { logout, resetDemoData } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'metrics' | 'doctors' | 'complaints' | 'audit'>('metrics');

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

  const handleUpdateDoctorStatus = async (
    doctorId: string,
    status: 'approved' | 'pending' | 'suspended'
  ) => {
    try {
      await adminService.updateDoctorVerification(doctorId, status);
      alert(`Doctor status updated to ${status.toUpperCase()}`);
      refetchDoctors();
      refetchMetrics();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Admin Header with Official Logo */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftCol}>
          <Image
            source={require('../../../assets/homecare-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.adminTitle}>Admin Management Console</Text>
          <Text style={styles.adminSub}>
            Doctor credentials review, platform analytics & Rwanda health data compliance audit
          </Text>
        </View>
        <Button
          title="Sign Out"
          variant="outline"
          size="sm"
          onPress={() => {
            logout();
            router.replace('/(auth)/welcome');
          }}
        />
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'metrics' && styles.tabActive]}
          onPress={() => setActiveTab('metrics')}
        >
          <Text style={[styles.tabText, activeTab === 'metrics' && styles.tabTextActive]}>
            Platform Metrics
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'doctors' && styles.tabActive]}
          onPress={() => setActiveTab('doctors')}
        >
          <Text style={[styles.tabText, activeTab === 'doctors' && styles.tabTextActive]}>
            Doctor Credentials ({doctors.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'complaints' && styles.tabActive]}
          onPress={() => setActiveTab('complaints')}
        >
          <Text style={[styles.tabText, activeTab === 'complaints' && styles.tabTextActive]}>
            Complaints ({complaints.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'audit' && styles.tabActive]}
          onPress={() => setActiveTab('audit')}
        >
          <Text style={[styles.tabText, activeTab === 'audit' && styles.tabTextActive]}>
            Audit Log ({auditLogs.length})
          </Text>
        </Pressable>
      </View>

      {/* TAB 1: Platform Metrics */}
      {activeTab === 'metrics' && (
        <View>
          <View style={styles.metricsGrid}>
            <Card style={styles.metricCard}>
              <Text style={styles.metricVal}>{metrics?.totalVisits || 0}</Text>
              <Text style={styles.metricLbl}>Total Consultations</Text>
            </Card>
            <Card style={styles.metricCard}>
              <Text style={styles.metricVal}>{metrics?.completedVisits || 0}</Text>
              <Text style={styles.metricLbl}>Completed Visits</Text>
            </Card>
            <Card style={styles.metricCard}>
              <Text style={styles.metricVal}>{metrics?.activeVisits || 0}</Text>
              <Text style={styles.metricLbl}>Active Underway</Text>
            </Card>
            <Card style={styles.metricCard}>
              <Text style={styles.metricVal}>
                {(metrics?.grossRevenueRwf || 0).toLocaleString()} RWF
              </Text>
              <Text style={styles.metricLbl}>Gross Billed Volume</Text>
            </Card>
            <Card style={styles.metricCard}>
              <View style={styles.ratingMetricRow}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.metricVal}>{metrics?.avgRating || 0}</Text>
              </View>
              <Text style={styles.metricLbl}>Average Doctor Rating</Text>
            </Card>
            <Card style={styles.metricCardWarning}>
              <Text style={[styles.metricVal, { color: '#B45309' }]}>
                {metrics?.pendingVerifications || 0}
              </Text>
              <Text style={styles.metricLbl}>Pending Doctor Reviews</Text>
            </Card>
          </View>

          <Card style={styles.configCard}>
            <Text style={styles.configTitle}>Platform Configuration Defaults</Text>
            <Text style={styles.configLine}>
              Coverage: {mockDomainStore.platformConfig.coverageDistricts.join(', ')} (Kigali)
            </Text>
            <Text style={styles.configLine}>
              Base Travel Allowance: {mockDomainStore.platformConfig.baseTravelFeeRwf} RWF
            </Text>
            <Text style={styles.configLine}>
              Emergency Helpline: {mockDomainStore.platformConfig.emergencyPhone} (Rwanda SAMU)
            </Text>
          </Card>
        </View>
      )}

      {/* TAB 2: Doctor Credential Review (FR-10.1) */}
      {activeTab === 'doctors' && (
        <View>
          {doctors.map((d) => (
            <Card key={d.userId} style={styles.docCard}>
              <View style={styles.docHeader}>
                <View>
                  <Text style={styles.docName}>{d.name}</Text>
                  <Text style={styles.docSpecialty}>
                    {d.specialty} • {d.licenseNumber}
                  </Text>
                  <Text style={styles.docContact}>
                    {d.email} • {d.phone}
                  </Text>
                </View>
                <Badge status={d.verificationStatus} size="sm" />
              </View>

              <Text style={styles.docQuals}>
                Qualifications: {d.qualifications.join(', ')} ({d.experienceYears} yrs exp)
              </Text>
              <Text style={styles.docDistricts}>
                Coverage: {d.coverageDistricts.join(', ')}
              </Text>

              {/* Administrative Verification Controls */}
              <View style={styles.docActions}>
                {d.verificationStatus !== 'approved' && (
                  <Button
                    title="Approve License"
                    size="sm"
                    onPress={() => handleUpdateDoctorStatus(d.userId, 'approved')}
                    style={{ flex: 1 }}
                  />
                )}
                {d.verificationStatus !== 'suspended' && (
                  <Button
                    title="Suspend Doctor"
                    variant="danger"
                    size="sm"
                    onPress={() => handleUpdateDoctorStatus(d.userId, 'suspended')}
                  />
                )}
                {d.verificationStatus !== 'pending' && (
                  <Button
                    title="Mark Pending"
                    variant="outline"
                    size="sm"
                    onPress={() => handleUpdateDoctorStatus(d.userId, 'pending')}
                  />
                )}
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* TAB 3: Complaints Resolution (FR-10.4) */}
      {activeTab === 'complaints' && (
        <View>
          {complaints.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No complaints reported.</Text>
            </Card>
          ) : (
            complaints.map((c) => (
              <Card key={c.id} style={styles.complaintCard}>
                <View style={styles.complaintHeader}>
                  <Text style={styles.complaintSubject}>{c.subject}</Text>
                  <Badge status={c.status === 'resolved' ? 'completed' : 'pending'} size="sm" />
                </View>
                <Text style={styles.complaintDetails}>"{c.details}"</Text>
                <Text style={styles.complaintMeta}>
                  Visit #{c.visitId} • Reported on {c.createdAt.split('T')[0]} by {c.reporterRole}
                </Text>
                {c.resolutionNotes && (
                  <Text style={styles.resolutionNotes}>Resolution: {c.resolutionNotes}</Text>
                )}
              </Card>
            ))
          )}
        </View>
      )}

      {/* TAB 4: Immutable Medical Record Access Audit Log (FR-10.5) */}
      {activeTab === 'audit' && (
        <View>
          <Card style={styles.auditDisclaimer}>
            <View style={styles.disclaimerRow}>
              <Ionicons name="lock-closed" size={16} color={THEME.colors.primaryDark} style={{ marginTop: 2, marginRight: 6 }} />
              <Text style={styles.auditDisclaimerText}>
                Immutable health data access log mandated under Rwandan Law No. 058/2021. Tracks clinical creation, modification, and patient export actions.
              </Text>
            </View>
          </Card>

          {auditLogs.map((log) => (
            <Card key={log.id} style={styles.auditCard}>
              <View style={styles.auditHeader}>
                <Text style={styles.auditAction}>[{log.action}] {log.entityType}</Text>
                <Text style={styles.auditTime}>{log.timestamp.replace('T', ' ').slice(0, 19)}</Text>
              </View>
              <Text style={styles.auditActor}>
                Actor: {log.actorName} ({log.actorRole.toUpperCase()})
              </Text>
              <Text style={styles.auditDetails}>{log.details}</Text>
              <Text style={styles.auditIds}>
                Entity ID: {log.entityId} • Patient: {log.patientId || 'N/A'}
              </Text>
            </Card>
          ))}
        </View>
      )}

      {/* Demo Reset in Admin */}
      <View style={styles.adminFooter}>
        <Button
          title="Reset Demo Environment to Baseline State"
          variant="secondary"
          onPress={() => {
            resetDemoData();
            refetchMetrics();
            refetchDoctors();
            refetchComplaints();
            refetchAudit();
            alert('All domain states reset to initial fixtures.');
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  headerLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  logoImage: {
    width: 145,
    height: 42,
    marginBottom: 4,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  adminSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    maxWidth: 260,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    padding: 6,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  metricCard: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
  },
  metricCardWarning: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    borderColor: '#FDE047',
  },
  ratingMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  metricLbl: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  configCard: {
    backgroundColor: THEME.colors.surfaceSubtle,
    marginBottom: THEME.spacing.md,
  },
  configTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  configLine: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 2,
  },
  docCard: {
    marginBottom: THEME.spacing.md,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  docName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  docSpecialty: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  docContact: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  docQuals: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  docDistricts: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  docActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: THEME.colors.borderLight,
    paddingTop: 8,
  },
  complaintCard: {
    marginBottom: THEME.spacing.md,
  },
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  complaintSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  complaintDetails: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  complaintMeta: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 6,
  },
  resolutionNotes: {
    fontSize: 11,
    color: THEME.colors.success,
    fontWeight: '600',
    marginTop: 4,
  },
  auditDisclaimer: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    marginBottom: THEME.spacing.md,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  auditDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#0F766E',
    lineHeight: 16,
  },
  auditCard: {
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  auditAction: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  auditTime: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  auditActor: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  auditDetails: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginVertical: 2,
  },
  auditIds: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  adminFooter: {
    marginTop: THEME.spacing.md,
  },
});
