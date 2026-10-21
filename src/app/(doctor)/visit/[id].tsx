// Doctor Visit Execution Cockpit: Status Progression & Navigation (SRS FR-4.6, FR-4.7)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '../../../constants/theme';
import { useAuthStore } from '../../../stores/authStore';
import { patientService, doctorService } from '../../../services/api';
import { mockDomainStore } from '../../../mock/mockDomainStore';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { VisitStatus } from '../../../types/domain';

export default function DoctorVisitCockpitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuthStore();
  const [updating, setUpdating] = useState(false);

  const { data: visit, refetch } = useQuery({
    queryKey: ['doctor-visit-detail', id],
    queryFn: () => patientService.getVisitDetails(id || ''),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const patientProfile = visit ? mockDomainStore.getPatientProfile(visit.patientId) : undefined;

  if (!visit) {
    return (
      <View style={styles.center}>
        <Text>Loading visit cockpit...</Text>
      </View>
    );
  }

  // Handle Lifecycle progression
  const handleTransitionStatus = async (nextStatus: VisitStatus) => {
    setUpdating(true);
    try {
      await doctorService.updateVisitExecutionStatus(visit.id, currentUser?.id || '', nextStatus);
      alert(`Visit status transitioned to: ${nextStatus.replace('_', ' ').toUpperCase()}`);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Status transition failed');
    } finally {
      setUpdating(false);
    }
  };

  // Launch External Navigation Maps (FR-4.7)
  const handleOpenNavigation = () => {
    const coords = visit.coordinates || { latitude: -1.9366, longitude: 30.1287 };
    const query = `${coords.latitude},${coords.longitude}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(visit.visitAddress)}@${query}`,
      android: `geo:0,0?q=${query}(${encodeURIComponent(visit.visitAddress)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        visit.visitAddress + ' Kigali'
      )}`,
    });
    Linking.openURL(url as string);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Cockpit Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.visitTitle}>VISIT #{visit.id.toUpperCase()}</Text>
          <Badge status={visit.status} size="md" />
        </View>
        <Text style={styles.patientHero}>{visit.patientName}</Text>
        <Text style={styles.scheduledInfo}>
          🗓️ Scheduled: {visit.scheduledDate} at {visit.scheduledTime}
        </Text>
      </View>

      {/* Navigation & Patient Residence Card */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Residence Destination (Kigali)</Text>
        <Text style={styles.addressText}>📍 {visit.visitAddress}</Text>
        <Text style={styles.districtText}>District: {visit.district}</Text>
        {visit.accessInstructions && (
          <Text style={styles.accessText}>Access Instructions: "{visit.accessInstructions}"</Text>
        )}

        <Button
          title="🚗 Open Maps Turn-by-Turn Navigation"
          variant="secondary"
          onPress={handleOpenNavigation}
          style={{ marginTop: 10 }}
        />
      </Card>

      {/* Patient Health Summary */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Patient Health Profile & Symptoms</Text>
        <Text style={styles.reportedSymptom}>Reported Complaint: {visit.conditionDescription}</Text>

        <View style={styles.healthGrid}>
          <Text style={styles.healthLine}>
            <Text style={styles.bold}>Allergies: </Text>
            {patientProfile?.allergies.join(', ') || 'NKDA (No known allergies)'}
          </Text>
          <Text style={styles.healthLine}>
            <Text style={styles.bold}>Chronic Conditions: </Text>
            {patientProfile?.knownConditions.join(', ') || 'None reported'}
          </Text>
          <Text style={styles.healthLine}>
            <Text style={styles.bold}>Current Medications: </Text>
            {patientProfile?.currentMedication.join(', ') || 'None reported'}
          </Text>
        </View>
      </Card>

      {/* Step-by-Step Status Transition Controls */}
      <Card style={styles.statusCockpitCard}>
        <Text style={styles.sectionTitle}>Visit Execution State Controls</Text>
        <Text style={styles.cockpitDesc}>
          Advance the visit stage in real time to update the patient and dispatch notifications:
        </Text>

        <View style={styles.stateButtons}>
          {visit.status === 'confirmed' && (
            <Button
              title="1. I Am On The Way (Depart Now)"
              onPress={() => handleTransitionStatus('on_the_way')}
              loading={updating}
            />
          )}

          {visit.status === 'on_the_way' && (
            <Button
              title="2. I Have Arrived At Gate / Residence"
              variant="secondary"
              onPress={() => handleTransitionStatus('arrived')}
              loading={updating}
            />
          )}

          {visit.status === 'arrived' && (
            <Button
              title="3. Begin Home Medical Consultation"
              onPress={() => handleTransitionStatus('in_consultation')}
              loading={updating}
            />
          )}

          {['in_consultation', 'completed'].includes(visit.status) && (
            <Button
              title="📝 Open Clinical Consultation Workspace"
              size="lg"
              onPress={() => router.push(`/(doctor)/consultation/${visit.id}` as any)}
              style={styles.workspaceBtn}
            />
          )}

          {visit.status === 'in_consultation' && (
            <Button
              title="Mark Home Visit Completed"
              variant="outline"
              onPress={() => handleTransitionStatus('completed')}
              loading={updating}
              style={{ marginTop: 6 }}
            />
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.base,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visitTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  patientHero: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  scheduledInfo: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  sectionCard: {
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  districtText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  accessText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  reportedSymptom: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  healthGrid: {
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    gap: 4,
  },
  healthLine: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  bold: {
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  statusCockpitCard: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  cockpitDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 12,
  },
  stateButtons: {
    gap: 10,
  },
  workspaceBtn: {
    backgroundColor: THEME.colors.primary,
  },
});
