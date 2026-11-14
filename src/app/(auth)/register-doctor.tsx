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
import { THEME, SupportedCountry, getCountryConfig } from '../../constants/theme';
import { authService } from '../../services/api';
import { CountryChips } from '../../components/ui/CountryChips';
import { useCountry, useLocaleStore } from '../../stores/localeStore';
import { InputField } from '../../components/ui/InputField';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterDoctorScreen() {
  const country = useCountry();
  const setCountry = useLocaleStore((state) => state.setCountry);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(country.phonePrefix);
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('General Medicine');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [experienceYears, setExperienceYears] = useState('5');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([country.districts[0]]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCountryChange = (code: SupportedCountry) => {
    setCountry(code);
    const next = getCountryConfig(code);
    setSelectedDistricts([next.districts[0]]);
    if (!phone.trim() || phone.trim().length <= 6) setPhone(next.phonePrefix);
  };

  const toggleDistrict = (district: string) => {
    if (selectedDistricts.includes(district)) {
      setSelectedDistricts(selectedDistricts.filter((d) => d !== district));
    } else {
      setSelectedDistricts([...selectedDistricts, district]);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) return setErrorMsg('Doctor full name is required.');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()))
      return setErrorMsg('A valid work email is required — your verification code is emailed there.');
    if (password.length < 8)
      return setErrorMsg('Password must be at least 8 characters.');
    if (!licenseNumber.trim())
      return setErrorMsg(`${country.regulatoryBody} license number is required.`);
    if (selectedDistricts.length === 0)
      return setErrorMsg(`Please choose at least one ${country.name} coverage district.`);

    setErrorMsg('');
    setLoading(true);
    try {
      const challenge = await authService.registerDoctor({
        name: name.trim().startsWith('Dr.') ? name.trim() : `Dr. ${name.trim()}`,
        email: email.trim(),
        phone: phone.trim(),
        password,
        specialty,
        licenseNumber: licenseNumber.trim(),
        qualifications: qualifications.split(',').map((q) => q.trim()).filter(Boolean),
        experienceYears: parseInt(experienceYears, 10) || 1,
        coverageDistricts: selectedDistricts,
        country: country.code,
      });

      router.push({
        pathname: '/(auth)/otp-verification',
        params: {
          userId: challenge.userId,
          destination: challenge.destination || email.trim(),
          role: 'doctor',
        },
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
          Provide residential medical consultations in {country.capitalCity} and across{' '}
          {country.name}. Professional credentials are authenticated before public listing.
        </Text>
      </View>

      <CountryChips value={country.code} onChange={handleCountryChange} label="Country of Practice" />

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
        label={`${country.regulatorShort} License No.`}
        placeholder={`e.g. ${country.licenseExample}`}
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
        placeholder={country.phonePlaceholder}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <InputField
        label="Work Email"
        placeholder={`doctor@example.${country.code.toLowerCase()}`}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        hint="We email your verification code here"
      />

      <InputField
        label="Password"
        placeholder="Create a secure password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        hint="Minimum 8 characters"
      />

      {/* Coverage Districts */}
      <View style={styles.districtSection}>
        <Text style={styles.sectionLabel}>{country.name} Coverage Districts</Text>
        <View style={styles.districtChips}>
          {country.districts.map((d) => {
            const isSelected = selectedDistricts.includes(d);
            return (
              <Pressable
                key={d}
                onPress={() => toggleDistrict(d)}
                style={[styles.districtChip, isSelected && styles.districtChipActive]}
              >
                <View style={styles.chipInner}>
                  <Ionicons
                    name={isSelected ? 'checkmark' : 'add'}
                    size={14}
                    color={isSelected ? '#FFF' : THEME.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.districtText, isSelected && styles.districtTextActive]}>
                    {d}
                  </Text>
                </View>
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
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
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
