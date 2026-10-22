// Doctor Requests Manager: Accept, Decline & Alternative Slot Proposal (SRS FR-4.2, FR-4.3, FR-4.4)
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
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { doctorService } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { VisitRequest } from '../../types/domain';

export default function DoctorRequestsScreen() {
  const { currentUser, doctorProfile } = useAuthStore();
  const [selectedVisit, setSelectedVisit] = useState<VisitRequest | null>(null);
  const [modalMode, setModalMode] = useState<'none' | 'decline' | 'alternative'>('none');
  const [declineReason, setDeclineReason] = useState('');
  const [altDate, setAltDate] = useState('2026-10-23');
  const [altTime, setAltTime] = useState('11:00');
  const [altNote, setAltNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: visits = [], refetch } = useQuery({
    queryKey: ['doctor-visits', currentUser?.id],
    queryFn: () => doctorService.getVisits(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  const isVerified = doctorProfile?.verificationStatus === 'approved';
  const pendingRequests = visits.filter((v) => v.status === 'pending');

  const handleAccept = async (visit: VisitRequest) => {
    if (!isVerified) {
      alert('Unverified or suspended doctors cannot accept patient visits.');
      return;
    }
    setSubmitting(true);
    try {
      await doctorService.acceptVisit(visit.id, currentUser?.id || '');
      alert(`Visit request from ${visit.patientName} accepted! Scheduled for ${visit.scheduledDate} at ${visit.scheduledTime}.`);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to accept visit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineSubmit = async () => {
    if (!selectedVisit) return;
    setSubmitting(true);
    try {
      await doctorService.declineVisit(selectedVisit.id, currentUser?.id || '', declineReason.trim());
      alert('Visit request declined.');
      setModalMode('none');
      setSelectedVisit(null);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to decline');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAlternativeSubmit = async () => {
    if (!selectedVisit) return;
    setSubmitting(true);
    try {
      await doctorService.proposeAlternativeTime(
        selectedVisit.id,
        currentUser?.id || '',
        altDate,
        altTime,
        altNote.trim()
      );
      alert(`Proposed alternative slot (${altDate} at ${altTime}) sent to ${selectedVisit.patientName}.`);
      setModalMode('none');
      setSelectedVisit(null);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to propose alternative slot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Incoming Consultation Requests</Text>
      <Text style={styles.headerSubtitle}>
        Review patient reported symptoms, location in Kigali, and confirm or propose rescheduling.
      </Text>

      {pendingRequests.length === 0 ? (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="mail-open-outline" size={36} color={THEME.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No pending visit requests</Text>
          <Text style={styles.emptyText}>New booking requests from patients will appear here immediately.</Text>
        </Card>
      ) : (
        pendingRequests.map((visit) => (
          <Card key={visit.id} style={styles.requestCard}>
            <View style={styles.reqHeader}>
              <View>
                <Text style={styles.patientName}>{visit.patientName}</Text>
                <View style={styles.phoneRow}>
                  <Ionicons name="call-outline" size={13} color={THEME.colors.textSecondary} />
                  <Text style={styles.patientPhone}>{visit.patientPhone}</Text>
                </View>
              </View>
              <Badge status={visit.status} size="sm" />
            </View>

            <View style={styles.timeTag}>
              <Ionicons name="calendar-outline" size={14} color={THEME.colors.primary} style={{ marginRight: 5 }} />
              <Text style={styles.timeTagText}>
                Requested: {visit.scheduledDate} at {visit.scheduledTime}
              </Text>
            </View>

            {/* Address */}
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={THEME.colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.infoText}>
                {visit.visitAddress} ({visit.district})
              </Text>
            </View>
            {visit.accessInstructions && (
              <Text style={styles.accessNotes}>Gate Note: {visit.accessInstructions}</Text>
            )}

            {/* Symptoms & Description */}
            <View style={styles.symptomsBox}>
              <Text style={styles.symptomsLabel}>Reported Condition:</Text>
              <Text style={styles.symptomsDesc}>{visit.conditionDescription}</Text>
              {visit.commonSymptoms && (
                <View style={styles.chipRow}>
                  {visit.commonSymptoms.map((s) => (
                    <View key={s} style={styles.chip}>
                      <Text style={styles.chipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Button
                title="Accept"
                size="sm"
                onPress={() => handleAccept(visit)}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <Button
                title="Propose Time"
                variant="outline"
                size="sm"
                onPress={() => {
                  setSelectedVisit(visit);
                  setModalMode('alternative');
                }}
                disabled={submitting}
                style={{ flex: 1 }}
              />
              <Button
                title="Decline"
                variant="danger"
                size="sm"
                onPress={() => {
                  setSelectedVisit(visit);
                  setModalMode('decline');
                }}
                disabled={submitting}
              />
            </View>
          </Card>
        ))
      )}

      {/* Decline Modal */}
      {modalMode === 'decline' && selectedVisit && (
        <Card style={styles.modalCard}>
          <Text style={styles.modalTitle}>Decline Visit Request</Text>
          <Text style={styles.modalSubtitle}>
            Decline request for {selectedVisit.patientName} on {selectedVisit.scheduledDate}
          </Text>
          <InputField
            label="Reason for Declining (Optional)"
            placeholder="e.g. In an emergency surgery, outside coverage area, or fully booked."
            value={declineReason}
            onChangeText={setDeclineReason}
            multiline
          />
          <View style={styles.modalBtns}>
            <Button
              title="Confirm Decline"
              variant="danger"
              onPress={handleDeclineSubmit}
              loading={submitting}
              style={{ flex: 1 }}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setModalMode('none')}
            />
          </View>
        </Card>
      )}

      {/* Alternative Time Modal */}
      {modalMode === 'alternative' && selectedVisit && (
        <Card style={styles.modalCard}>
          <Text style={styles.modalTitle}>Propose Alternative Appointment Time</Text>
          <Text style={styles.modalSubtitle}>
            Propose a different time slot for {selectedVisit.patientName}:
          </Text>

          <InputField
            label="Alternative Date (YYYY-MM-DD)"
            value={altDate}
            onChangeText={setAltDate}
          />

          <InputField
            label="Alternative Time (HH:mm)"
            value={altTime}
            onChangeText={setAltTime}
          />

          <InputField
            label="Explanation Note for Patient"
            placeholder="e.g. Earlier slot unavailable due to clinic round. Can visit at 11:00 AM."
            value={altNote}
            onChangeText={setAltNote}
          />

          <View style={styles.modalBtns}>
            <Button
              title="Send Proposed Slot"
              onPress={handleAlternativeSubmit}
              loading={submitting}
              style={{ flex: 1 }}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setModalMode('none')}
            />
          </View>
        </Card>
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
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 38,
    marginBottom: 8,
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
    marginTop: 4,
  },
  requestCard: {
    marginBottom: THEME.spacing.md,
  },
  reqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  patientPhone: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  timeTagText: {
    fontSize: 12,
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  infoText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  accessNotes: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  symptomsBox: {
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    marginVertical: 6,
  },
  symptomsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  symptomsDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  chip: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 10,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  modalCard: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FACC15',
    marginTop: THEME.spacing.md,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#854D0E',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#713F12',
    marginTop: 2,
    marginBottom: 10,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
});
