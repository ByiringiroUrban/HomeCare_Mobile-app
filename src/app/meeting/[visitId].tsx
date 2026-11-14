// Online Video Consultation Room (Agora RTC) — Google Meet style meeting surface
// shared by doctors and patients of the same visit.
// Doctors get an in-call prescription pad (℞) so medication can be written and
// published to the patient while the video call is still running.
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AGORA_CONFIG } from '../../constants/agora';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { patientService, doctorService } from '../../services/api';
import { agoraChannelForVisit, agoraUidFromUserId, buildRtcToken } from '../../services/agoraToken';
import { buildMeetingHtml } from '../../components/consultation/meetingHtml';
import { AgoraMeet } from '../../components/consultation/AgoraMeet';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { PrescriptionItem } from '../../types/domain';

function meetingCodeFor(channel: string): string {
  const compact = channel.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const first = compact.slice(-6, -3) || 'HCR';
  const second = compact.slice(-3) || 'OOM';
  return `HC-${first}-${second}`;
}

export default function OnlineConsultationScreen() {
  const params = useLocalSearchParams<{ visitId: string }>();
  const visitId = (Array.isArray(params.visitId) ? params.visitId[0] : params.visitId) || '';
  const { currentUser } = useAuthStore();

  const { data: visit } = useQuery({
    queryKey: ['visit-details', visitId],
    queryFn: () => patientService.getVisitDetails(visitId),
    enabled: !!visitId,
  });

  const userId = currentUser?.id || '';
  const userName = currentUser?.name || 'Guest';
  const userRole = currentUser?.role || 'patient';
  const isDoctor = userRole === 'doctor';

  const peerName = isDoctor
    ? visit?.patientName || 'Patient'
    : visit?.doctorName || 'Your specialist';

  // --- In-call electronic prescription pad (doctor only) ---
  const [rxOpen, setRxOpen] = useState(false);
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([]);
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('1 tablet');
  const [frequency, setFrequency] = useState('Twice daily');
  const [durationDays, setDurationDays] = useState('5');
  const [instructions, setInstructions] = useState('Take after meals');
  const [sending, setSending] = useState(false);

  const handleAddRx = () => {
    if (!medName.trim()) return alert('Enter the medication name first.');
    setRxItems([
      ...rxItems,
      {
        id: `rx-${Date.now()}-${rxItems.length}`,
        medicationName: medName.trim(),
        dosage: dosage.trim() || '1 tablet',
        frequency: frequency.trim() || 'As directed',
        durationDays: parseInt(durationDays, 10) || 5,
        instructions: instructions.trim() || 'Take as directed by doctor.',
      },
    ]);
    setMedName('');
    setInstructions('Take after meals');
  };

  const handleRemoveRx = (id: string) => {
    setRxItems(rxItems.filter((item) => item.id !== id));
  };

  const handleSendRx = async () => {
    if (!currentUser || !visit) return;
    setSending(true);
    try {
      await doctorService.sendPrescriptionInCall(
        { visitId: visit.id, patientId: visit.patientId, items: rxItems },
        currentUser
      );
      setRxItems([]);
      setRxOpen(false);
      alert(
        `Prescription sent to ${visit.patientName}. It is now visible in the patient's dashboard under Records › Prescriptions.`
      );
    } catch (err: any) {
      alert(err.message || 'Failed to send prescription');
    } finally {
      setSending(false);
    }
  };

  const html = useMemo(() => {
    if (!userId || !visitId) return '';
    const channel = agoraChannelForVisit(visitId);
    const uid = agoraUidFromUserId(userId);
    const token = buildRtcToken({
      appId: AGORA_CONFIG.appId,
      appCertificate: AGORA_CONFIG.appCertificate,
      channelName: channel,
      uid,
      expireSeconds: AGORA_CONFIG.tokenTtlSeconds,
    });

    return buildMeetingHtml({
      appId: AGORA_CONFIG.appId,
      channel,
      token,
      uid,
      displayName: userName,
      roleLabel: isDoctor ? 'Doctor' : 'Patient',
      peerName,
      peerRoleLabel: isDoctor ? 'Patient' : 'Doctor',
      meetingTitle: `Consultation with ${peerName}`,
      meetingCode: meetingCodeFor(channel),
    });
  }, [userId, userName, isDoctor, peerName, visitId]);

  const handleMessage = useCallback(
    (message: Record<string, any>) => {
      if (message.type !== 'leave') return;
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace((isDoctor ? '/(doctor)' : '/(patient)') as any);
      }
    },
    [isDoctor]
  );

  if (!currentUser) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Sign in to join the consultation</Text>
        <Text style={styles.fallbackText}>
          The video room is private to the doctor and patient of this visit.
        </Text>
        <Button title="Back to sign in" onPress={() => router.replace('/(auth)/welcome')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* In-call tools strip — doctor only, kept above the video so it never covers the controls */}
      {isDoctor && (
        <View style={styles.doctorBar}>
          <View style={styles.doctorBarInfo}>
            <Ionicons name="medkit" size={15} color={THEME.colors.accent} />
            <Text style={styles.doctorBarText} numberOfLines={1}>
              In-call tools · {visit?.patientName || 'Patient'}
            </Text>
          </View>
          <Pressable style={styles.rxButton} onPress={() => setRxOpen(true)}>
            <Text style={styles.rxButtonText}>℞ Write prescription</Text>
          </Pressable>
        </View>
      )}

      <AgoraMeet html={html} onMessage={handleMessage} />

      {/* Prescription pad modal */}
      <Modal
        visible={rxOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRxOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.modalTitle}>℞ Prescription Pad</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {visit?.patientName} · Visit #{visit?.id.toUpperCase()}
                </Text>
              </View>
              <Pressable onPress={() => setRxOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={THEME.colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {rxItems.length > 0 && (
                <View style={styles.rxList}>
                  {rxItems.map((item) => (
                    <View key={item.id} style={styles.rxRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.rxName}>{item.medicationName}</Text>
                        <Text style={styles.rxMeta}>
                          {item.dosage} · {item.frequency} · {item.durationDays} days
                        </Text>
                        <Text style={styles.rxNote} numberOfLines={2}>
                          {item.instructions}
                        </Text>
                      </View>
                      <Pressable onPress={() => handleRemoveRx(item.id)} style={styles.removeBtn}>
                        <Ionicons name="close-circle-outline" size={20} color={THEME.colors.error} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <InputField
                label="Medication Name"
                placeholder="e.g. Amoxicillin 500mg"
                value={medName}
                onChangeText={setMedName}
              />
              <InputField label="Dosage" value={dosage} onChangeText={setDosage} />
              <InputField label="Frequency" value={frequency} onChangeText={setFrequency} />
              <InputField
                label="Duration (Days)"
                value={durationDays}
                onChangeText={setDurationDays}
                keyboardType="numeric"
              />
              <InputField
                label="Instructions to Patient"
                value={instructions}
                onChangeText={setInstructions}
                multiline
              />

              <Button
                title="+ Add Medication"
                variant="secondary"
                size="sm"
                onPress={handleAddRx}
              />

              <View style={styles.modalActions}>
                <Button
                  title={
                    rxItems.length === 0
                      ? 'Send Prescription to Patient'
                      : `Send ${rxItems.length} Medication${rxItems.length > 1 ? 's' : ''} to Patient`
                  }
                  size="lg"
                  disabled={rxItems.length === 0}
                  loading={sending}
                  onPress={handleSendRx}
                />
                <Text style={styles.modalHint}>
                  The patient sees it immediately in their dashboard and medical records — no need
                  to leave the call.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#202124',
  },
  doctorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#292A2D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  doctorBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  doctorBarText: {
    fontSize: 12,
    color: '#E8EAED',
    fontWeight: '600',
    flexShrink: 1,
  },
  rxButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  rxButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.lg,
    gap: 12,
    backgroundColor: THEME.colors.background,
  },
  fallbackTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingTop: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.base,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    padding: THEME.spacing.base,
    paddingBottom: 32,
    gap: 4,
  },
  rxList: {
    gap: 8,
    marginBottom: 10,
  },
  rxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    padding: 10,
  },
  rxName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  rxMeta: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  rxNote: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  removeBtn: {
    padding: 6,
    marginLeft: 6,
  },
  modalActions: {
    marginTop: 14,
    gap: 8,
  },
  modalHint: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
});
