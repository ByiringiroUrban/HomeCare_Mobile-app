// Patient Profile & Settings (SRS FR-1.4, NFR-3.2 Privacy & Export)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { THEME, APP_CONFIG } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { patientService } from '../../services/api';
import { InputField } from '../../components/ui/InputField';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export default function PatientProfileScreen() {
  const { currentUser, patientProfile, logout, resetDemoData, refreshProfile } = useAuthStore();

  const [address, setAddress] = useState(patientProfile?.residenceAddress || '');
  const [district, setDistrict] = useState(patientProfile?.district || 'Gasabo');
  const [allergies, setAllergies] = useState(patientProfile?.allergies.join(', ') || '');
  const [conditions, setConditions] = useState(patientProfile?.knownConditions.join(', ') || '');
  const [medications, setMedications] = useState(patientProfile?.currentMedication.join(', ') || '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await patientService.updateProfile(currentUser.id, {
        residenceAddress: address,
        district,
        allergies: allergies.split(',').map((s) => s.trim()).filter(Boolean),
        knownConditions: conditions.split(',').map((s) => s.trim()).filter(Boolean),
        currentMedication: medications.split(',').map((s) => s.trim()).filter(Boolean),
      });
      await refreshProfile();
      alert('Medical health profile updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    alert(
      'Exported Patient Health Record Archive (Encrypted JSON). Under Rwanda Data Protection Law, you may download your complete consultation history.'
    );
  };

  const handleDeleteRequest = () => {
    alert(
      'Account deletion & health record purge requested. Standard medical retention period rules apply.'
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Account Info */}
      <Card style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{currentUser?.name.charAt(0) || 'P'}</Text>
        </View>
        <Text style={styles.userName}>{currentUser?.name}</Text>
        <Text style={styles.userRole}>Registered Patient • {currentUser?.phone}</Text>
        <Text style={styles.userEmail}>{currentUser?.email}</Text>
      </Card>

      {/* Medical Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical & Residence Details</Text>
        <Text style={styles.sectionSubtitle}>
          These details are shared with attending specialists during home visits:
        </Text>

        <InputField
          label="Default Kigali Residence Address"
          placeholder="KG 18 Ave, House 42, Kibagabaga"
          value={address}
          onChangeText={setAddress}
        />

        <InputField
          label="District"
          placeholder="Gasabo / Kicukiro / Nyarugenge"
          value={district}
          onChangeText={setDistrict}
        />

        <InputField
          label="Known Allergies (Comma separated)"
          placeholder="e.g. Penicillin, Aspirin, Pollen"
          value={allergies}
          onChangeText={setAllergies}
        />

        <InputField
          label="Known Chronic Conditions"
          placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes"
          value={conditions}
          onChangeText={setConditions}
        />

        <InputField
          label="Current Daily Medications"
          placeholder="e.g. Metformin 500mg, Salbutamol Inhaler"
          value={medications}
          onChangeText={setMedications}
        />

        <Button
          title="Save Medical Profile"
          onPress={handleSaveProfile}
          loading={saving}
          size="md"
        />
      </View>

      {/* Emergency Contact Card */}
      <Card style={styles.emergencyCard}>
        <Text style={styles.emergencyTitle}>Registered Emergency Contact</Text>
        <Text style={styles.emergencyName}>
          {patientProfile?.emergencyContact.name || 'Next of Kin'} ({patientProfile?.emergencyContact.relationship || 'Relative'})
        </Text>
        <Text style={styles.emergencyPhone}>
          📞 {patientProfile?.emergencyContact.phone || '+250 788 000 000'}
        </Text>
      </Card>

      {/* Privacy, Regulatory & Data Protection (SRS NFR-3.1, NFR-3.2) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Health Data Rights</Text>
        <Text style={styles.legalNotice}>
          In compliance with Rwandan Law No. 058/2021 on Personal Data Protection, your medical records are accessible only to you and authorized doctors with whom you have active or completed appointments.
        </Text>

        <View style={styles.dataButtons}>
          <Button
            title="📥 Export My Health Data"
            variant="outline"
            size="sm"
            onPress={handleExportData}
          />
          <Button
            title="Request Account Deletion"
            variant="ghost"
            size="sm"
            onPress={handleDeleteRequest}
          />
        </View>
      </View>

      {/* Demo Controls & Sign Out */}
      <View style={styles.footerSection}>
        <Button
          title="Reset Demo Data to Initial State"
          variant="secondary"
          onPress={() => {
            resetDemoData();
            alert('Demo database reset to default fixtures.');
          }}
          style={{ marginBottom: 10 }}
        />

        <Button
          title="Sign Out"
          variant="danger"
          onPress={() => {
            logout();
            router.replace('/(auth)/welcome');
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
  userCard: {
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  userRole: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 10,
  },
  emergencyCard: {
    marginBottom: THEME.spacing.md,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  emergencyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  emergencyName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  emergencyPhone: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  legalNotice: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 12,
  },
  dataButtons: {
    gap: 8,
  },
  footerSection: {
    marginTop: THEME.spacing.sm,
  },
});
