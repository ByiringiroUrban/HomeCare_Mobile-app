// Patient Medical History, Electronic Prescriptions & Laboratory Results (SRS FR-6.4, FR-7.2, FR-7.3, FR-7.4)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { patientService } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export default function PatientRecordsScreen() {
  const { currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'consultations' | 'prescriptions' | 'results'>('consultations');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['patient-records', currentUser?.id],
    queryFn: () => patientService.getRecords(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  const consultations = data?.consultations || [];
  const results = data?.results || [];

  return (
    <View style={styles.container}>
      {/* Category Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'consultations' && styles.tabActive]}
          onPress={() => setActiveTab('consultations')}
        >
          <Text style={[styles.tabText, activeTab === 'consultations' && styles.tabTextActive]}>
            Consultations ({consultations.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'prescriptions' && styles.tabActive]}
          onPress={() => setActiveTab('prescriptions')}
        >
          <Text style={[styles.tabText, activeTab === 'prescriptions' && styles.tabTextActive]}>
            Prescriptions (Rx)
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'results' && styles.tabActive]}
          onPress={() => setActiveTab('results')}
        >
          <Text style={[styles.tabText, activeTab === 'results' && styles.tabTextActive]}>
            Lab Results ({results.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tab 1: Chronological Consultations */}
        {activeTab === 'consultations' && (
          <View>
            {consultations.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No published consultation records found.</Text>
              </View>
            ) : (
              consultations.map((rec) => (
                <Card key={rec.id} style={styles.recordCard}>
                  <View style={styles.recordHeader}>
                    <View>
                      <Text style={styles.recordDate}>{rec.createdAt.split('T')[0]}</Text>
                      <Text style={styles.diagnosisTitle}>Diagnosis: {rec.diagnosis}</Text>
                      {rec.icdCode && <Text style={styles.icdCode}>ICD Code: {rec.icdCode}</Text>}
                    </View>
                    <Badge status="completed" label="Published" size="sm" />
                  </View>

                  <View style={styles.sectionDivider} />

                  <Text style={styles.subHeading}>Physical Examination Findings:</Text>
                  <Text style={styles.examText}>{rec.physicalExamination}</Text>

                  <Text style={[styles.subHeading, { marginTop: 8 }]}>Clinical Notes:</Text>
                  <Text style={styles.notesText}>{rec.consultationNotes}</Text>

                  {rec.recommendations && rec.recommendations.length > 0 && (
                    <View style={styles.recsBox}>
                      <Text style={styles.recTitle}>Doctor Recommendations:</Text>
                      {rec.recommendations.map((item, idx) => (
                        <Text key={idx} style={styles.recItem}>
                          • {item}
                        </Text>
                      ))}
                    </View>
                  )}

                  {rec.followUpRecommended && (
                    <View style={styles.followUpCard}>
                      <Text style={styles.followUpText}>
                        🗓️ Follow-up Recommended for: {rec.followUpDate}
                      </Text>
                      {rec.followUpNotes && (
                        <Text style={styles.followUpSub}>{rec.followUpNotes}</Text>
                      )}
                    </View>
                  )}
                </Card>
              ))
            )}
          </View>
        )}

        {/* Tab 2: Electronic Prescriptions */}
        {activeTab === 'prescriptions' && (
          <View>
            {consultations.flatMap((c) => c.prescriptions).length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active or historical prescriptions.</Text>
              </View>
            ) : (
              consultations.map((c) =>
                c.prescriptions.map((rx) => (
                  <Card key={rx.id} style={styles.rxCard}>
                    <View style={styles.rxHeader}>
                      <Text style={styles.rxBadge}>℞ PRESCRIPTION</Text>
                      <Text style={styles.rxDate}>{c.createdAt.split('T')[0]}</Text>
                    </View>
                    <Text style={styles.rxMedName}>{rx.medicationName}</Text>
                    <View style={styles.rxRow}>
                      <Text style={styles.rxLabel}>Dosage:</Text>
                      <Text style={styles.rxVal}>{rx.dosage}</Text>
                    </View>
                    <View style={styles.rxRow}>
                      <Text style={styles.rxLabel}>Frequency:</Text>
                      <Text style={styles.rxVal}>{rx.frequency}</Text>
                    </View>
                    <View style={styles.rxRow}>
                      <Text style={styles.rxLabel}>Duration:</Text>
                      <Text style={styles.rxVal}>{rx.durationDays} Days</Text>
                    </View>
                    <Text style={styles.rxInstructions}>"{rx.instructions}"</Text>
                  </Card>
                ))
              )
            )}
          </View>
        )}

        {/* Tab 3: Laboratory Results & Downloadable PDFs */}
        {activeTab === 'results' && (
          <View>
            {results.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No laboratory results uploaded yet.</Text>
              </View>
            ) : (
              results.map((res) => (
                <Card
                  key={res.id}
                  style={styles.labCard}
                  onPress={() => router.push(`/(patient)/result/${res.id}` as any)}
                >
                  <View style={styles.labHeader}>
                    <View style={styles.labTag}>
                      <Text style={styles.labTagText}>LAB SPECIMEN</Text>
                    </View>
                    <Text style={styles.labDate}>{res.publishedAt.split('T')[0]}</Text>
                  </View>

                  <Text style={styles.labTitle}>{res.title}</Text>
                  <Text style={styles.labFindings} numberOfLines={2}>
                    {res.summaryFindings}
                  </Text>

                  <View style={styles.labFooter}>
                    <Text style={styles.doctorSign}>Published by {res.doctorName}</Text>
                    <Pressable
                      style={styles.viewPdfBtn}
                      onPress={() => router.push(`/(patient)/result/${res.id}` as any)}
                    >
                      <Text style={styles.viewPdfText}>View PDF Report ›</Text>
                    </Pressable>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    padding: 6,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: THEME.colors.primarySoft,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  content: {
    padding: THEME.spacing.base,
    paddingBottom: THEME.spacing.xxl,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  recordCard: {
    marginBottom: THEME.spacing.md,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  diagnosisTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  icdCode: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: 10,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  examText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 6,
    borderRadius: 4,
  },
  notesText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  recsBox: {
    marginTop: 10,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
  },
  recTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  recItem: {
    fontSize: 11,
    color: '#15803D',
    lineHeight: 16,
  },
  followUpCard: {
    marginTop: 10,
    backgroundColor: '#FEF9C3',
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
  },
  followUpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854D0E',
  },
  followUpSub: {
    fontSize: 11,
    color: '#713F12',
    marginTop: 2,
  },
  rxCard: {
    marginBottom: THEME.spacing.md,
    backgroundColor: '#F8FAFC',
  },
  rxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rxBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  rxDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  rxMedName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  rxRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  rxLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    width: 80,
  },
  rxVal: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  rxInstructions: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 6,
    backgroundColor: THEME.colors.surface,
    padding: 6,
    borderRadius: 4,
  },
  labCard: {
    marginBottom: THEME.spacing.md,
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  labHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  labTag: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labTagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  labDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  labTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  labFindings: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  labFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#CCFBF1',
    paddingTop: 8,
  },
  doctorSign: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  viewPdfBtn: {
    paddingVertical: 4,
  },
  viewPdfText: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
});
