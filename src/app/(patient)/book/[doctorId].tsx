// Comprehensive 9-Step Home Visit Booking Flow (SRS FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-3.5, FR-8.1, FR-8.2)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { THEME, APP_CONFIG } from '../../../constants/theme';
import { useAuthStore } from '../../../stores/authStore';
import { patientService } from '../../../services/api';
import { InputField } from '../../../components/ui/InputField';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { PaymentMethod, AvailabilitySlot } from '../../../types/domain';

const COMMON_SYMPTOMS = [
  'Fever / Chills',
  'Persistent Cough',
  'Chest Heaviness',
  'Severe Headache',
  'Skin Rash / Itching',
  'Abdominal Pain',
  'Pediatric Illness',
  'Fatigue / Weakness',
];

export default function BookVisitScreen() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const { currentUser, patientProfile } = useAuthStore();

  const { data: details } = useQuery({
    queryKey: ['doctor-details', doctorId],
    queryFn: () => patientService.getDoctorDetails(doctorId || ''),
    enabled: !!doctorId,
  });

  const doctor = details?.doctor;
  const slots = details?.slots || [];

  // Form State
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-22');
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [conditionDescription, setConditionDescription] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [hasAttachment, setHasAttachment] = useState<boolean>(false);
  const [address, setAddress] = useState<string>(
    patientProfile?.residenceAddress || 'KG 18 Ave, House 42, Kibagabaga'
  );
  const [district, setDistrict] = useState<string>(patientProfile?.district || 'Gasabo');
  const [accessNotes, setAccessNotes] = useState<string>(
    'Ring black gate bell. Security guard at entrance.'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
  const [momoNumber, setMomoNumber] = useState<string>(currentUser?.phone || '+250 788 000 000');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const handleSelectSlot = (slot: any) => {
    setSelectedSlotId(slot.id);
    setSelectedDate(slot.date);
    setSelectedTime(slot.startTime);
  };

  const handleUseGpsPin = () => {
    // Simulated GPS pin resolution for Kigali
    setAddress('KG 690 St, Near Kigali Heights, Kimihurura');
    setDistrict('Gasabo');
    alert('GPS pin recorded: Kimihurura (-1.9536, 30.0897)');
  };

  const handleSubmitBooking = async () => {
    if (!conditionDescription.trim()) {
      setErrorMsg('Please describe your symptoms or reason for the consultation.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter your home address for the doctor visit.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);
    try {
      const consultationFee = doctor?.consultationFeeRwf || 25000;
      const travelFee = doctor?.travelFeeRwf || 5000;
      const total = consultationFee + travelFee;

      const visit = await patientService.createVisitRequest({
        patientId: currentUser?.id || 'patient-101',
        patientName: currentUser?.name || 'Diane Uwase',
        patientPhone: currentUser?.phone || '+250 788 412 901',
        doctorId: doctor?.userId || doctorId || '',
        doctorName: doctor?.name || 'Dr. Eric Kayitare',
        doctorSpecialty: doctor?.specialty || 'General Medicine',
        slotId: selectedSlotId,
        scheduledDate: selectedDate,
        scheduledTime: selectedTime,
        conditionDescription: conditionDescription.trim(),
        commonSymptoms: selectedSymptoms,
        attachmentUrls: hasAttachment
          ? ['https://homecare.rw/uploads/sample-prior-prescription.jpg']
          : [],
        visitAddress: address.trim(),
        district,
        accessInstructions: accessNotes.trim(),
        coordinates: { latitude: -1.9366, longitude: 30.1287 },
        consultationFeeRwf: consultationFee,
        travelFeeRwf: travelFee,
        totalFeeRwf: total,
        paymentMethod,
        paymentStatus: 'pending',
      });

      // Route to visit tracking screen
      router.replace(`/(patient)/visit/${visit.id}` as any);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit visit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const consultationFee = doctor?.consultationFeeRwf || 25000;
  const travelFee = doctor?.travelFeeRwf || 5000;
  const total = consultationFee + travelFee;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Book Home Consultation</Text>
        <Text style={styles.subtitle}>
          With {doctor?.name || 'Specialist'} ({doctor?.specialty || 'General Medicine'})
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Step 1 & 2: Slot Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Date & Available Time Slot</Text>
        <Text style={styles.sectionSubtitle}>
          Choose from doctor's verified open windows or choose default:
        </Text>

        <View style={styles.slotList}>
          {slots.length > 0 ? (
            slots
              .filter((s: AvailabilitySlot) => !s.isBooked)
              .map((s: AvailabilitySlot) => {
                const isSelected = selectedSlotId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => handleSelectSlot(s)}
                    style={[styles.slotChip, isSelected && styles.slotChipActive]}
                  >
                    <Text style={[styles.slotDate, isSelected && styles.slotTextActive]}>
                      {s.date}
                    </Text>
                    <Text style={[styles.slotTime, isSelected && styles.slotTextActive]}>
                      {s.startTime} - {s.endTime}
                    </Text>
                  </Pressable>
                );
              })
          ) : (
            <Pressable
              onPress={() => {
                setSelectedDate('2026-10-22');
                setSelectedTime('10:00');
              }}
              style={[styles.slotChip, styles.slotChipActive]}
            >
              <Text style={[styles.slotDate, styles.slotTextActive]}>2026-10-22</Text>
              <Text style={[styles.slotTime, styles.slotTextActive]}>10:00 AM</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Step 3 & 4: Symptoms & Attachments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Reason for Visit & Symptoms</Text>
        <Text style={styles.sectionSubtitle}>
          Select common condition indicators to help the doctor prepare equipment:
        </Text>

        <View style={styles.symptomsGrid}>
          {COMMON_SYMPTOMS.map((sym) => {
            const isSelected = selectedSymptoms.includes(sym);
            return (
              <Pressable
                key={sym}
                onPress={() => toggleSymptom(sym)}
                style={[styles.symptomChip, isSelected && styles.symptomChipActive]}
              >
                <View style={styles.chipInner}>
                  <Ionicons
                    name={isSelected ? 'checkmark' : 'add'}
                    size={14}
                    color={isSelected ? '#FFF' : THEME.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.symptomText, isSelected && styles.symptomTextActive]}>
                    {sym}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <InputField
          label="Detailed Description of Condition *"
          placeholder="Describe when symptoms began, fever progression, or specific concerns..."
          value={conditionDescription}
          onChangeText={setConditionDescription}
          multiline
        />

        {/* Attachment simulation */}
        <Pressable
          style={styles.attachmentButton}
          onPress={() => {
            setHasAttachment(!hasAttachment);
            alert(
              hasAttachment
                ? 'Sample report removed.'
                : 'Prior prescription photo attached: sample-prior-prescription.jpg'
            );
          }}
        >
          <Ionicons
            name={hasAttachment ? 'attach' : 'cloud-upload-outline'}
            size={18}
            color={THEME.colors.primaryDark}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.attachmentText}>
            {hasAttachment
              ? 'Attached: sample-prior-prescription.jpg (Tap to remove)'
              : 'Optionally attach photo or prior lab report'}
          </Text>
        </Pressable>
      </View>

      {/* Step 5 & 6: Address & Access Instructions */}
      <View style={styles.section}>
        <View style={styles.addressHeader}>
          <Text style={styles.sectionTitle}>3. Residence Visit Address</Text>
          <Pressable onPress={handleUseGpsPin} style={styles.gpsBtn}>
            <Ionicons name="navigate-circle" size={14} color={THEME.colors.primaryDark} style={{ marginRight: 3 }} />
            <Text style={styles.gpsBtnText}>Use GPS Pin</Text>
          </Pressable>
        </View>

        <InputField
          label="Street Address / House Number *"
          placeholder="e.g. KG 18 Ave, House 42, Kibagabaga"
          value={address}
          onChangeText={setAddress}
        />

        <InputField
          label="Kigali District *"
          placeholder="Gasabo / Kicukiro / Nyarugenge"
          value={district}
          onChangeText={setDistrict}
        />

        <InputField
          label="Gate & Landmark Instructions"
          placeholder="e.g. Black gate, ring left buzzer, opposite supermarket"
          value={accessNotes}
          onChangeText={setAccessNotes}
        />
      </View>

      {/* Step 7: Fee Breakdown & Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Fee Breakdown & Payment Option</Text>

        <Card style={styles.feeBreakdownCard}>
          <View style={styles.feeRow}>
            <Text style={styles.feeRowLabel}>Specialist Consultation Fee</Text>
            <Text style={styles.feeRowVal}>{consultationFee.toLocaleString()} RWF</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeRowLabel}>Travel & Transportation Fee</Text>
            <Text style={styles.feeRowVal}>{travelFee.toLocaleString()} RWF</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeRowLabel}>Laboratory Testing Fee</Text>
            <Text style={styles.feeRowUndetermined}>Determined after doctor examination</Text>
          </View>
          <View style={styles.feeDivider} />
          <View style={styles.feeRow}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalVal}>{total.toLocaleString()} RWF</Text>
          </View>
        </Card>

        <Text style={[styles.sectionSubtitle, { marginTop: 12 }]}>
          Select Payment Method (Simulated):
        </Text>
        <View style={styles.paymentMethods}>
          <Pressable
            style={[styles.payChip, paymentMethod === 'momo' && styles.payChipActive]}
            onPress={() => setPaymentMethod('momo')}
          >
            <Text style={[styles.payText, paymentMethod === 'momo' && styles.payTextActive]}>
              MTN Mobile Money
            </Text>
          </Pressable>

          <Pressable
            style={[styles.payChip, paymentMethod === 'airtel' && styles.payChipActive]}
            onPress={() => setPaymentMethod('airtel')}
          >
            <Text style={[styles.payText, paymentMethod === 'airtel' && styles.payTextActive]}>
              Airtel Money
            </Text>
          </Pressable>

          <Pressable
            style={[styles.payChip, paymentMethod === 'cash_on_visit' && styles.payChipActive]}
            onPress={() => setPaymentMethod('cash_on_visit')}
          >
            <Text style={[styles.payText, paymentMethod === 'cash_on_visit' && styles.payTextActive]}>
              Cash on Visit
            </Text>
          </Pressable>
        </View>

        {paymentMethod !== 'cash_on_visit' && (
          <InputField
            label="Mobile Money Number (Simulated)"
            placeholder="+250 788 000 000"
            value={momoNumber}
            onChangeText={setMomoNumber}
            keyboardType="phone-pad"
            containerStyle={{ marginTop: 10 }}
          />
        )}
      </View>

      {/* Step 8 & 9: Submission */}
      <Button
        title={`Confirm & Request Visit (${total.toLocaleString()} RWF)`}
        size="lg"
        onPress={handleSubmitBooking}
        loading={submitting}
        style={styles.submitBtn}
      />
      <Text style={styles.policyFootnote}>
        Request remains pending until accepted by {doctor?.name || 'the physician'}. Free cancellation permitted prior to doctor departure.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    paddingBottom: 60,
  },
  header: {
    marginBottom: THEME.spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: THEME.colors.errorSoft,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  slotList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  slotChipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primarySoft,
  },
  slotDate: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  slotTime: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  slotTextActive: {
    color: THEME.colors.primaryDark,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  symptomChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symptomChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  symptomText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  symptomTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.primarySoft,
    marginTop: 4,
  },
  attachmentIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  attachmentText: {
    fontSize: 12,
    color: THEME.colors.primaryDark,
    fontWeight: '600',
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpsBtn: {
    backgroundColor: THEME.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.borderRadius.sm,
  },
  gpsBtnText: {
    fontSize: 11,
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  feeBreakdownCard: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderColor: THEME.colors.borderLight,
    padding: 12,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  feeRowLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  feeRowVal: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  feeRowUndetermined: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  feeDivider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  totalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  payChip: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  payChipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primarySoft,
  },
  payText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  payTextActive: {
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: THEME.spacing.md,
  },
  policyFootnote: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});
