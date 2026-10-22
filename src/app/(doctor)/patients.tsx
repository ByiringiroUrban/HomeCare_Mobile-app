// Doctor Assigned Patients Directory & Isolation Guard (SRS FR-4.5, NFR-2.3)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { doctorService } from '../../services/api';
import { mockDomainStore } from '../../mock/mockDomainStore';
import { Card } from '../../components/ui/Card';

export default function DoctorPatientsScreen() {
  const { currentUser } = useAuthStore();

  const { data: visits = [] } = useQuery({
    queryKey: ['doctor-visits', currentUser?.id],
    queryFn: () => doctorService.getVisits(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  // Extract unique patients assigned to this doctor
  const uniquePatientIds = Array.from(new Set(visits.map((v) => v.patientId)));
  const assignedPatients = uniquePatientIds
    .map((pid) => {
      const profile = mockDomainStore.getPatientProfile(pid);
      const user = mockDomainStore.getUser(pid);
      const patientVisits = visits.filter((v) => v.patientId === pid);
      return { profile, user, patientVisits };
    })
    .filter((p) => p.user);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Assigned Patient Directory</Text>
      <Text style={styles.headerSubtitle}>
        Doctors have access only to patients with whom they have an active or completed home visit appointment (NFR-2.3 Access Control).
      </Text>

      {assignedPatients.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="people-outline" size={36} color={THEME.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No patients assigned yet</Text>
          <Text style={styles.emptyText}>Patients who book visits with you will appear here.</Text>
        </Card>
      ) : (
        assignedPatients.map(({ user, profile, patientVisits }) => (
          <Card key={user?.id} style={styles.patientCard}>
            <View style={styles.patientHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name.charAt(0)}</Text>
              </View>
              <View style={styles.nameCol}>
                <Text style={styles.name}>{user?.name}</Text>
                <View style={styles.contactRow}>
                  <Ionicons name="call-outline" size={13} color={THEME.colors.textSecondary} />
                  <Text style={styles.contact}>
                    {user?.phone} • {profile?.age || 30} yrs ({profile?.gender || 'N/A'})
                  </Text>
                </View>
              </View>
            </View>

            {/* Health Info */}
            <View style={styles.healthInfo}>
              <Text style={styles.healthRow}>
                <Text style={styles.healthLabel}>Allergies: </Text>
                {profile?.allergies.join(', ') || 'None reported'}
              </Text>
              <Text style={styles.healthRow}>
                <Text style={styles.healthLabel}>Chronic Conditions: </Text>
                {profile?.knownConditions.join(', ') || 'None reported'}
              </Text>
              <Text style={styles.healthRow}>
                <Text style={styles.healthLabel}>Current Medications: </Text>
                {profile?.currentMedication.join(', ') || 'None reported'}
              </Text>
              <Text style={styles.healthRow}>
                <Text style={styles.healthLabel}>Residence: </Text>
                {profile?.residenceAddress} ({profile?.district})
              </Text>
            </View>

            <View style={styles.visitsBadge}>
              <Text style={styles.visitsBadgeText}>
                {patientVisits.length} consultation{patientVisits.length > 1 ? 's' : ''} on record
              </Text>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    paddingBottom: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    marginBottom: THEME.spacing.md,
    lineHeight: 16,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  patientCard: {
    marginBottom: THEME.spacing.md,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  contact: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  healthInfo: {
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    gap: 4,
    marginVertical: 4,
  },
  healthRow: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  healthLabel: {
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  visitsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  visitsBadgeText: {
    fontSize: 10,
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
});
