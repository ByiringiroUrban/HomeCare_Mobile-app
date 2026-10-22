// Patient Visit Tracking, Timeline & Actions Screen (SRS FR-3.6, FR-4.3, FR-9.1, FR-9.2)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';
import { useAuthStore } from '../../../stores/authStore';
import { patientService } from '../../../services/api';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { InputField } from '../../../components/ui/InputField';

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuthStore();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { data: visit, refetch } = useQuery({
    queryKey: ['visit-details', id],
    queryFn: () => patientService.getVisitDetails(id || ''),
    enabled: !!id,
    refetchInterval: 3000, // Poll state transitions in demo
  });

  if (!visit) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading consultation details...</Text>
      </View>
    );
  }

  // Handle Cancel Visit
  const handleCancel = async () => {
    try {
      setActionLoading(true);
      await patientService.cancelVisit(visit.id, currentUser?.id || '', 'Patient cancelled prior to departure');
      alert('Visit cancelled successfully.');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Cannot cancel visit');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Accept Alternative Time proposed by Doctor
  const handleAcceptAlternative = async () => {
    try {
      setActionLoading(true);
      await patientService.acceptAlternativeTime(visit.id, currentUser?.id || '');
      alert(`Alternative slot confirmed for ${visit.alternativeDate} at ${visit.alternativeTime}!`);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to accept alternative slot');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject Alternative Time
  const handleRejectAlternative = async () => {
    try {
      setActionLoading(true);
      await patientService.rejectAlternativeTime(visit.id, currentUser?.id || '');
      alert('Alternative slot rejected.');
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to reject slot');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Review
  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) return alert('Please enter review feedback.');
    setActionLoading(true);
    await patientService.submitReview({
      visitId: visit.id,
      patientId: currentUser?.id || 'patient-101',
      patientName: currentUser?.name || 'Diane Uwase',
      doctorId: visit.doctorId,
      rating,
      comment: reviewComment.trim(),
    });
    setActionLoading(false);
    setShowRatingModal(false);
    alert('Thank you for rating your specialist consultation!');
  };

  // Submit Complaint
  const handleSubmitComplaint = async () => {
    if (!complaintSubject.trim() || !complaintDetails.trim()) {
      return alert('Please fill in subject and details.');
    }
    setActionLoading(true);
    await patientService.submitComplaint({
      visitId: visit.id,
      reporterUserId: currentUser?.id || 'patient-101',
      reporterRole: 'patient',
      subject: complaintSubject.trim(),
      details: complaintDetails.trim(),
    });
    setActionLoading(false);
    setShowComplaintModal(false);
    alert('Your complaint has been submitted to platform administrators for review.');
  };

  const isLockedFromCancellation = ['on_the_way', 'arrived', 'in_consultation', 'completed'].includes(
    visit.status
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Top Status Header */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeaderRow}>
          <Text style={styles.visitCode}>VISIT #{visit.id.toUpperCase()}</Text>
          <Badge status={visit.status} size="md" />
        </View>
        <Text style={styles.scheduledHero}>
          {visit.scheduledDate} at {visit.scheduledTime}
        </Text>
        <Text style={styles.doctorHeadline}>
          Attending: {visit.doctorName} ({visit.doctorSpecialty})
        </Text>
      </View>

      {/* Alternative Time Acceptance Banner */}
      {visit.status === 'alternative_proposed' && (
        <Card style={styles.alternativeCard}>
          <Text style={styles.altTitle}>Doctor Proposed Alternative Time</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Ionicons name="calendar-outline" size={16} color="#713F12" style={{ marginRight: 5 }} />
            <Text style={styles.altDateTime}>
              {visit.alternativeDate} at {visit.alternativeTime}
            </Text>
          </View>
          {visit.alternativeProposalNote && (
            <Text style={styles.altNote}>Note: "{visit.alternativeProposalNote}"</Text>
          )}

          <View style={styles.altActionRow}>
            <Button
              title="Accept Alternative Slot"
              onPress={handleAcceptAlternative}
              loading={actionLoading}
              size="sm"
              style={{ flex: 1 }}
            />
            <Button
              title="Decline"
              variant="outline"
              onPress={handleRejectAlternative}
              disabled={actionLoading}
              size="sm"
            />
          </View>
        </Card>
      )}

      {/* Lifecycle Progress Timeline */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visit Progress Timeline</Text>
        <View style={styles.timeline}>
          {[
            { key: 'pending', label: '1. Request Submitted' },
            { key: 'confirmed', label: '2. Specialist Accepted' },
            { key: 'on_the_way', label: '3. Doctor On The Way' },
            { key: 'arrived', label: '4. Doctor Arrived' },
            { key: 'in_consultation', label: '5. In Consultation' },
            { key: 'completed', label: '6. Visit Completed' },
          ].map((step, idx) => {
            const stepsOrder = [
              'pending',
              'confirmed',
              'on_the_way',
              'arrived',
              'in_consultation',
              'completed',
            ];
            const currentIdx = stepsOrder.indexOf(visit.status);
            const isFinished = currentIdx >= idx;
            const isCurrent = visit.status === step.key;

            return (
              <View key={step.key} style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    isFinished && styles.timelineDotDone,
                    isCurrent && styles.timelineDotActive,
                  ]}
                >
                  {isFinished ? (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  ) : (
                    <Text style={styles.timelineDotText}>{idx + 1}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.timelineText,
                    isFinished && styles.timelineTextDone,
                    isCurrent && styles.timelineTextActive,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Residence & Patient Notes */}
      <Card style={styles.detailsCard}>
        <Text style={styles.detailsCardTitle}>Residence Visit Address</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="location-outline" size={15} color={THEME.colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.addressLine}>{visit.visitAddress}</Text>
        </View>
        <Text style={styles.districtLine}>Kigali District: {visit.district}</Text>
        {visit.accessInstructions ? (
          <Text style={styles.instructionsLine}>Landmark/Gate: {visit.accessInstructions}</Text>
        ) : null}

        <View style={styles.divider} />

        <Text style={styles.detailsCardTitle}>Reported Symptoms & Reason</Text>
        <Text style={styles.symptomsText}>{visit.conditionDescription}</Text>
        {visit.commonSymptoms && visit.commonSymptoms.length > 0 && (
          <View style={styles.symptomChips}>
            {visit.commonSymptoms.map((s) => (
              <View key={s} style={styles.symChip}>
                <Text style={styles.symText}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Financial Details */}
      <Card style={styles.detailsCard}>
        <Text style={styles.detailsCardTitle}>Billing & Payment Status</Text>
        <View style={styles.feeLine}>
          <Text style={styles.feeLabel}>Total Consultation & Travel:</Text>
          <Text style={styles.feeValue}>{visit.totalFeeRwf.toLocaleString()} RWF</Text>
        </View>
        <View style={styles.feeLine}>
          <Text style={styles.feeLabel}>Payment Method:</Text>
          <Text style={styles.feeValue}>{visit.paymentMethod.toUpperCase()}</Text>
        </View>
        <View style={styles.feeLine}>
          <Text style={styles.feeLabel}>Payment Status:</Text>
          <Badge status={visit.paymentStatus} size="sm" />
        </View>
      </Card>

      {/* Cancellation / Reschedule Restriction Banner */}
      {isLockedFromCancellation && visit.status !== 'completed' && (
        <View style={styles.lockNotice}>
          <Ionicons name="lock-closed" size={15} color={THEME.colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.lockNoticeText}>
            Cancellation and rescheduling are locked because the doctor is en route or at your residence.
          </Text>
        </View>
      )}

      {/* Action Buttons for Patients */}
      <View style={styles.actionsSection}>
        {!isLockedFromCancellation && visit.status !== 'cancelled' && (
          <Button
            title="Cancel Visit"
            variant="danger"
            onPress={handleCancel}
            loading={actionLoading}
            style={styles.actionBtn}
          />
        )}

        {visit.status === 'completed' && (
          <View style={styles.completedActions}>
            <Button
              title="Rate & Review Doctor"
              variant="primary"
              onPress={() => setShowRatingModal(true)}
              style={styles.actionBtn}
            />
            <Button
              title="View Consultation Records & Lab Results"
              variant="outline"
              onPress={() => router.push('/(patient)/records')}
              style={styles.actionBtn}
            />
          </View>
        )}

        <Button
          title="Report Issue or Complaint"
          variant="ghost"
          onPress={() => setShowComplaintModal(true)}
        />
      </View>

      {/* Rating Modal Sheet */}
      {showRatingModal && (
        <Card style={styles.modalCard}>
          <Text style={styles.modalTitle}>Rate Doctor Consultation</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s: number) => (
              <Pressable key={s} onPress={() => setRating(s)} style={{ padding: 4 }}>
                <Ionicons
                  name={rating >= s ? 'star' : 'star-outline'}
                  size={28}
                  color={rating >= s ? '#F59E0B' : THEME.colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
          <InputField
            label="Your Review"
            placeholder="Share feedback on punctuality, clinical care, and bedside manner..."
            value={reviewComment}
            onChangeText={setReviewComment}
            multiline
          />
          <View style={styles.modalBtns}>
            <Button
              title="Submit Review"
              onPress={handleSubmitReview}
              loading={actionLoading}
              style={{ flex: 1 }}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowRatingModal(false)}
            />
          </View>
        </Card>
      )}

      {/* Complaint Modal */}
      {showComplaintModal && (
        <Card style={styles.modalCard}>
          <Text style={styles.modalTitle}>Report an Issue / Complaint</Text>
          <InputField
            label="Subject"
            placeholder="e.g. Doctor delay, fee dispute, or etiquette"
            value={complaintSubject}
            onChangeText={setComplaintSubject}
          />
          <InputField
            label="Detailed Complaint"
            placeholder="Explain what occurred..."
            value={complaintDetails}
            onChangeText={setComplaintDetails}
            multiline
          />
          <View style={styles.modalBtns}>
            <Button
              title="Submit to Admin"
              variant="danger"
              onPress={handleSubmitComplaint}
              loading={actionLoading}
              style={{ flex: 1 }}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowComplaintModal(false)}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  statusCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.base,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visitCode: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  scheduledHero: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  doctorHeadline: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  alternativeCard: {
    backgroundColor: '#FEF9C3',
    borderColor: '#FDE047',
    marginBottom: THEME.spacing.md,
  },
  altTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#854D0E',
  },
  altDateTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#713F12',
    marginTop: 4,
  },
  altNote: {
    fontSize: 12,
    color: '#713F12',
    marginTop: 2,
    fontStyle: 'italic',
  },
  altActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  section: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 10,
  },
  timeline: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  timelineDotDone: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  timelineDotActive: {
    backgroundColor: THEME.colors.accent,
    borderColor: THEME.colors.accent,
  },
  timelineDotText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  timelineText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  timelineTextDone: {
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  timelineTextActive: {
    color: THEME.colors.accent,
    fontWeight: '800',
  },
  detailsCard: {
    marginBottom: THEME.spacing.md,
  },
  detailsCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  addressLine: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    fontWeight: '600',
  },
  districtLine: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  instructionsLine: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.borderLight,
    marginVertical: 10,
  },
  symptomsText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  symptomChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  symChip: {
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  symText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  feeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  feeLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  lockNotice: {
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.md,
  },
  lockNoticeText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  actionsSection: {
    gap: 8,
  },
  completedActions: {
    gap: 8,
  },
  actionBtn: {
    marginBottom: 4,
  },
  modalCard: {
    marginTop: THEME.spacing.md,
    backgroundColor: '#F8FAFC',
    borderColor: '#94A3B8',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  starBtn: {
    fontSize: 28,
    color: '#CBD5E1',
  },
  starBtnActive: {
    color: '#D97706',
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
});
