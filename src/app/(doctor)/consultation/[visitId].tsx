// Doctor Consultation Workspace (SRS FR-6.1, FR-6.2, FR-6.3, FR-6.5, FR-7.1)
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
import { THEME } from '../../../constants/theme';
import { useAuthStore } from '../../../stores/authStore';
import { patientService, doctorService } from '../../../services/api';
import { mockDomainStore } from '../../../mock/mockDomainStore';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { InputField } from '../../../components/ui/InputField';
import { PrescriptionItem, LabSample } from '../../../types/domain';
import { Ionicons } from '@expo/vector-icons';

export default function DoctorConsultationWorkspaceScreen() {
  const { visitId } = useLocalSearchParams<{ visitId: string }>();
  const { currentUser } = useAuthStore();

  const { data: visit } = useQuery({
    queryKey: ['visit-details', visitId],
    queryFn: () => patientService.getVisitDetails(visitId || ''),
    enabled: !!visitId,
  });

  const existingRecord = visitId ? mockDomainStore.getConsultationByVisit(visitId) : undefined;

  // Clinical State Form
  const [physicalExam, setPhysicalExam] = useState(
    existingRecord?.physicalExamination ||
      'BP: 120/80 mmHg | HR: 74 bpm | SpO2: 99% | Temp: 37.1 C | Chest clear to auscultation'
  );
  const [diagnosis, setDiagnosis] = useState(
    existingRecord?.diagnosis || 'Acute Rhinopharyngitis (Common Cold)'
  );
  const [icdCode, setIcdCode] = useState(existingRecord?.icdCode || 'J00');
  const [clinicalNotes, setClinicalNotes] = useState(
    existingRecord?.consultationNotes ||
      'Patient examined at residence. Symptoms started 4 days ago. Rest and fluids advised.'
  );
  const [recommendations, setRecommendations] = useState(
    existingRecord?.recommendations.join('\n') ||
      'Drink plenty of warm fluids.\nRest at home for 48 hours.\nMonitor temperature twice daily.'
  );

  // Electronic Prescriptions
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>(
    existingRecord?.prescriptions || [
      {
        id: 'rx-tmp-1',
        medicationName: 'Paracetamol 500mg',
        dosage: '1 tablet',
        frequency: 'Every 8 hours as needed',
        durationDays: 3,
        instructions: 'Take after meals for fever relief.',
      },
    ]
  );
  const [newMedName, setNewMedName] = useState('');
  const [newDosage, setNewDosage] = useState('1 tablet');
  const [newFreq, setNewFreq] = useState('Twice daily');
  const [newDuration, setNewDuration] = useState('5');

  // Lab Specimen Collection (SRS FR-6.2, FR-6.3)
  const [isLabRequired, setIsLabRequired] = useState(existingRecord?.isLabRequired || false);
  const [labTests, setLabTests] = useState('Full Blood Count (FBC), Malaria Rapid Test');
  const [sampleCollected, setSampleCollected] = useState(false);

  // Result Upload / Publication (SRS FR-7.1)
  const [publishResultNow, setPublishResultNow] = useState(false);
  const [labFindingsSummary, setLabFindingsSummary] = useState(
    'FBC within normal limits. Malaria RDT: Negative. CRP: Normal.'
  );

  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleAddPrescription = () => {
    if (!newMedName.trim()) return alert('Enter medication name.');
    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      medicationName: newMedName.trim(),
      dosage: newDosage.trim(),
      frequency: newFreq.trim(),
      durationDays: parseInt(newDuration, 10) || 5,
      instructions: 'Take as directed by doctor.',
    };
    setPrescriptions([...prescriptions, newItem]);
    setNewMedName('');
  };

  const handleRemovePrescription = (id: string) => {
    setPrescriptions(prescriptions.filter((p) => p.id !== id));
  };

  const handleSaveDraft = async () => {
    if (!currentUser || !visit) return;
    setSavingDraft(true);
    try {
      await doctorService.saveConsultationDraft(
        {
          visitId: visit.id,
          patientId: visit.patientId,
          doctorId: currentUser.id,
          consultationNotes: clinicalNotes.trim(),
          physicalExamination: physicalExam.trim(),
          diagnosis: diagnosis.trim(),
          icdCode: icdCode.trim(),
          prescriptions,
          recommendations: recommendations.split('\n').filter(Boolean),
          isLabRequired,
          requiredLabTests: isLabRequired ? labTests.split(',').map((t) => t.trim()) : [],
          followUpRecommended: true,
          followUpDate: '2026-10-28',
          followUpNotes: 'Check resolution of acute symptoms.',
        },
        currentUser
      );
      alert('Consultation record draft saved.');
    } catch (err: any) {
      alert(err.message || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublishRecord = async () => {
    if (!currentUser || !visit) return;
    if (!diagnosis.trim()) return alert('Diagnosis is required to publish record.');

    setPublishing(true);
    try {
      let sampleId: string | undefined;

      // Create lab specimen tracking record if tests required (FR-6.3)
      if (isLabRequired && sampleCollected) {
        const sample: LabSample = {
          id: `smp-${Date.now().toString().slice(-4)}`,
          sampleCode: `SMP-KGL-${Math.floor(1000 + Math.random() * 9000)}`,
          visitId: visit.id,
          patientId: visit.patientId,
          doctorId: currentUser.id,
          testNames: labTests.split(',').map((t) => t.trim()),
          collectionTime: new Date().toISOString(),
          destinationLab: 'Kigali Central Biomedical Lab',
          status: 'collected',
          notes: 'Cold chain secured during transport.',
        };
        mockDomainStore.createSample(sample);
        sampleId = sample.id;
      }

      // Publish Consultation Record
      await doctorService.publishConsultationRecord(
        {
          visitId: visit.id,
          patientId: visit.patientId,
          doctorId: currentUser.id,
          consultationNotes: clinicalNotes.trim(),
          physicalExamination: physicalExam.trim(),
          diagnosis: diagnosis.trim(),
          icdCode: icdCode.trim(),
          prescriptions,
          recommendations: recommendations.split('\n').filter(Boolean),
          isLabRequired,
          requiredLabTests: isLabRequired ? labTests.split(',').map((t) => t.trim()) : [],
          sampleId,
          followUpRecommended: true,
          followUpDate: '2026-10-28',
          followUpNotes: 'Check resolution of symptoms.',
        },
        currentUser
      );

      // Publish Lab Result if toggled (FR-7.1)
      if (publishResultNow) {
        await doctorService.publishLabResult(
          {
            visitId: visit.id,
            patientId: visit.patientId,
            patientName: visit.patientName,
            doctorId: currentUser.id,
            doctorName: currentUser.name,
            title: `Laboratory Results: ${labTests}`,
            category: 'laboratory',
            summaryFindings: labFindingsSummary.trim(),
          },
          currentUser
        );
      }

      alert('Medical consultation record & prescriptions published to patient dashboard!');
      router.replace(`/(doctor)/visit/${visit.id}` as any);
    } catch (err: any) {
      alert(err.message || 'Failed to publish record');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Clinical Consultation Workspace</Text>
      <Text style={styles.headerSubtitle}>
        Patient: {visit?.patientName} • Visit #{visit?.id.toUpperCase()}
      </Text>

      {/* Physical Examination */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>1. Vital Signs & Physical Examination</Text>
        <InputField
          label="Examination Findings at Residence"
          placeholder="e.g. BP, Heart Rate, Respiratory Rate, Auscultation..."
          value={physicalExam}
          onChangeText={setPhysicalExam}
          multiline
        />
      </Card>

      {/* Diagnosis & Clinical Notes */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>2. Clinical Diagnosis & ICD-10</Text>
        <InputField
          label="Primary Diagnosis *"
          placeholder="e.g. Acute Bronchitis, Type 2 Diabetes"
          value={diagnosis}
          onChangeText={setDiagnosis}
        />
        <InputField
          label="ICD-10 Code"
          placeholder="e.g. J20.9"
          value={icdCode}
          onChangeText={setIcdCode}
        />
        <InputField
          label="Clinical Consultation Notes"
          placeholder="Detailed observations and clinical history..."
          value={clinicalNotes}
          onChangeText={setClinicalNotes}
          multiline
        />
      </Card>

      {/* Electronic Prescriptions (Rx) */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>3. Electronic Prescriptions (Rx)</Text>

        {prescriptions.map((p) => (
          <View key={p.id} style={styles.rxItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rxName}>{p.medicationName}</Text>
              <Text style={styles.rxDetails}>
                {p.dosage} • {p.frequency} • {p.durationDays} days
              </Text>
              <Text style={styles.rxInst}>"{p.instructions}"</Text>
            </View>
            <Pressable onPress={() => handleRemovePrescription(p.id)} style={styles.removeBtn}>
              <Ionicons name="close-circle-outline" size={20} color={THEME.colors.error} />
            </Pressable>
          </View>
        ))}

        <View style={styles.addRxBox}>
          <Text style={styles.addRxTitle}>Add Medication to Prescription:</Text>
          <InputField
            label="Medication Name"
            placeholder="e.g. Amoxicillin 500mg"
            value={newMedName}
            onChangeText={setNewMedName}
          />
          <View style={styles.rxRow}>
            <InputField
              label="Dosage"
              value={newDosage}
              onChangeText={setNewDosage}
              containerStyle={{ flex: 1 }}
            />
            <InputField
              label="Frequency"
              value={newFreq}
              onChangeText={setNewFreq}
              containerStyle={{ flex: 1 }}
            />
          </View>
          <InputField
            label="Duration (Days)"
            value={newDuration}
            onChangeText={setNewDuration}
            keyboardType="numeric"
          />
          <Button
            title="+ Add Medication"
            variant="secondary"
            size="sm"
            onPress={handleAddPrescription}
          />
        </View>
      </Card>

      {/* Laboratory Specimen Collection */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>4. Laboratory Testing & Specimen Tracking</Text>
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setIsLabRequired(!isLabRequired)}
        >
          <View style={[styles.checkbox, isLabRequired && styles.checkboxActive]}>
            {isLabRequired && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <Text style={styles.checkboxText}>Laboratory specimen tests required</Text>
        </Pressable>

        {isLabRequired && (
          <View style={{ marginTop: 8 }}>
            <InputField
              label="Required Lab Tests (Comma separated)"
              value={labTests}
              onChangeText={setLabTests}
            />

            <Pressable
              style={styles.checkboxRow}
              onPress={() => setSampleCollected(!sampleCollected)}
            >
              <View style={[styles.checkbox, sampleCollected && styles.checkboxActive]}>
                {sampleCollected && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.checkboxText}>
                Blood / Swab specimen collected on-site at patient residence
              </Text>
            </Pressable>
          </View>
        )}
      </Card>

      {/* Direct Results Publication Toggle (FR-7.1) */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>5. Publish Laboratory Results Immediately</Text>
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setPublishResultNow(!publishResultNow)}
        >
          <View style={[styles.checkbox, publishResultNow && styles.checkboxActive]}>
            {publishResultNow && <Ionicons name="checkmark" size={14} color="#FFF" />}
          </View>
          <Text style={styles.checkboxText}>
            Upload and publish validated laboratory result document to patient now
          </Text>
        </Pressable>

        {publishResultNow && (
          <InputField
            label="Diagnostic Summary Findings for PDF"
            value={labFindingsSummary}
            onChangeText={setLabFindingsSummary}
            multiline
            containerStyle={{ marginTop: 8 }}
          />
        )}
      </Card>

      {/* Recommendations */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>6. Patient Advice & Lifestyle Guidance</Text>
        <InputField
          label="Instructions & Care Advice (One per line)"
          value={recommendations}
          onChangeText={setRecommendations}
          multiline
        />
      </Card>

      {/* Actions */}
      <View style={styles.actionButtons}>
        <Button
          title="Save Consultation Draft"
          variant="outline"
          onPress={handleSaveDraft}
          loading={savingDraft}
        />
        <Button
          title="Publish Record to Patient Dashboard"
          size="lg"
          onPress={handlePublishRecord}
          loading={publishing}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    paddingBottom: 80,
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
  sectionCard: {
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  rxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSubtle,
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 6,
  },
  rxName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  rxDetails: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 1,
  },
  rxInst: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
  },
  removeText: {
    color: THEME.colors.error,
    fontSize: 14,
    fontWeight: '700',
  },
  addRxBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: THEME.colors.borderLight,
    paddingTop: 8,
  },
  addRxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  rxRow: {
    flexDirection: 'row',
    gap: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: THEME.colors.surface,
  },
  checkboxActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  checkMark: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  checkboxText: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  actionButtons: {
    gap: 10,
    marginTop: THEME.spacing.md,
  },
});
