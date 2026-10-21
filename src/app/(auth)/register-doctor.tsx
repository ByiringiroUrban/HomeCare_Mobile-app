// Doctor Registration with Credentials (SRS FR-1.6)
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
import { authService } from '../../services/api';
import { InputField } from '../../components/ui/InputField';
import { Button } from '../../components/ui/Button';

export default function RegisterDoctorScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+250 78');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(['Gasabo']);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleDistrict = (district: string) => {
    if (selectedDistricts.includes(district)) {
      setSelectedDistricts(selectedDistricts.filter((d) => d !== district));
    } else {
      setSelectedDistricts([...selectedDistricts, district]);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) return setErrorMsg('Doctor full name is required.');
    if (!licenseNumber.trim()) return setErrorMsg('Rwanda Medical and Dental Council license number is required.');
    if (selectedDistricts.length === 0) return setErrorMsg('Please choose at least one Kigali coverage district.');

    setErrorMsg('');
    setLoading(true);
    try {
      const user = await authService.registerDoctor({
        name: name.trim().startsWith('Dr.') ? name.trim() : `Dr. ${name.trim()}`,
        email: email.trim(),
        phone: phone.trim(),
        specialty,
        licenseNumber: licenseNumber.trim(),
        qualifications: qualifications.split(',').map((q) => q.trim()).filter(Boolean),
        experienceYears: parseInt(experienceYears, 10) || 1,
        coverageDistricts: selectedDistricts,
      });

      router.push({
        pathname: '/(auth)/otp-verification',
        params: { userId: user.id, destination: phone || email, role: 'doctor' },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Doctor onboarding failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Join as Specialist Doctor</Text>
        <Text style={styles.subtitle}>
          Provide residential medical consultations in Kigali. Professional credentials are authenticated before public listing.
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <InputField
        label="Doctor Full Name"
        placeholder="e.g. Dr. Eric Kayitare"
        value={name}
        onChangeText={setName}
      />

      <InputField
        label="Medical Specialty"
        placeholder="e.g. General Medicine, Pediatrics, Cardiology"
        value={specialty}
        onChangeText={setSpecialty}
      />

      <InputField
        label="Rwanda Medical Council (RMDC) License No."
        placeholder="e.g. RMC/2018/0412"
        value={licenseNumber}
        onChangeText={setLicenseNumber}
      />

      <InputField
        label="Qualifications & Degrees"
        placeholder="e.g. MBBS, M.Med Pediatrics (comma separated)"
        value={qualifications}
        onChangeText={setQualifications}
      />

      <InputField
        label="Years of Clinical Experience"
        placeholder="e.g. 8"
        value={experienceYears}
        onChangeText={setExperienceYears}
        keyboardType="numeric"
      />

      <InputField
        label="Contact Phone"
        placeholder="+250 788 000 000"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <InputField
        label="Work Email"
        placeholder="doctor@example.rw"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Coverage Districts */}
      <View style={styles.districtSection}>
        <Text style={styles.sectionLabel}>Kigali Coverage Districts</Text>
        <View style={styles.districtChips}>
          {APP_CONFIG.coverageDistricts.map((d) => {
            const isSelected = selectedDistricts.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => toggleDistrict(d)}
                style={[styles.districtChip, isSelected && styles.districtChipActive]}
              >
                <Text style={[styles.districtText, isSelected && styles.districtTextActive]}>
                  {isSelected ? '✓ ' : '+ '}
                  {d}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button
        title="Submit Credentials for Review"
        onPress={handleRegister}
        loading={loading}
        size="lg"
        style={styles.submitBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    flexGrow: 1,
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
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
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
  districtSection: {
    marginBottom: THEME.spacing.lg,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  districtChips: {
    flexDirection: 'row',
    gap: 8,
  },
  districtChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  districtChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  districtText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  districtTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.xxl,
  },
});
