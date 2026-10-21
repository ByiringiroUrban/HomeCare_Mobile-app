// Patient Registration with Health Data Processing Consent (SRS FR-1.1 & FR-1.5)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { THEME } from '../../constants/theme';
import { authService } from '../../services/api';
import { InputField } from '../../components/ui/InputField';
import { Button } from '../../components/ui/Button';

export default function RegisterPatientScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+250 78');
  const [password, setPassword] = useState('');
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentHealthData, setConsentHealthData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) {
      setErrorMsg('Full legal name is required.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setErrorMsg('Please enter an email or phone number.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (!consentTerms) {
      setErrorMsg('You must agree to the Terms of Service to proceed.');
      return;
    }
    if (!consentHealthData) {
      setErrorMsg('Explicit consent for processing health data is legally required for home consultations.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const user = await authService.registerPatient({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      // Navigate to OTP verification
      router.push({
        pathname: '/(auth)/otp-verification',
        params: { userId: user.id, destination: phone || email, role: 'patient' },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Patient Account</Text>
        <Text style={styles.subtitle}>
          Sign up to request verified specialist visits and view examination records.
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <InputField
        label="Full Name"
        placeholder="e.g. Diane Uwase"
        value={name}
        onChangeText={setName}
      />

      <InputField
        label="Phone Number (Rwanda)"
        placeholder="+250 788 000 000"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <InputField
        label="Email Address (Optional)"
        placeholder="diane@example.rw"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <InputField
        label="Password"
        placeholder="Create a secure password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        hint="Minimum 6 characters"
      />

      {/* Consent Checkboxes (FR-1.5 Law on Personal Data Protection) */}
      <View style={styles.consentSection}>
        <Pressable
          style={styles.checkboxRow}
          onPress={() => setConsentTerms(!consentTerms)}
        >
          <View style={[styles.checkbox, consentTerms && styles.checkboxActive]}>
            {consentTerms && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to the <Text style={styles.linkText}>Terms of Service</Text> and Privacy Policy.
          </Text>
        </Pressable>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setConsentHealthData(!consentHealthData)}
        >
          <View style={[styles.checkbox, consentHealthData && styles.checkboxActive]}>
            {consentHealthData && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I give explicit consent to the collection and processing of my sensitive medical consultation records and laboratory test results as mandated under Rwandan Law No. 058/2021 relating to personal data protection.
          </Text>
        </Pressable>
      </View>

      <Button
        title="Continue to OTP Verification"
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
  consentSection: {
    marginVertical: THEME.spacing.md,
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  checkMark: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 17,
  },
  linkText: {
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xl,
  },
});
