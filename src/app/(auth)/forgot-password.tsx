// Password Reset Screen (SRS FR-1.3)
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { THEME } from '../../constants/theme';
import { authService } from '../../services/api';
import { InputField } from '../../components/ui/InputField';
import { Button } from '../../components/ui/Button';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) return alert('Please enter your email or phone.');
    setLoading(true);
    await authService.resetPassword(email);
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your registered contact to receive password recovery instructions.
        </Text>
      </View>

      {submitted ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Reset Link Dispatched</Text>
          <Text style={styles.successText}>
            A recovery code has been sent to {email}. Follow the instructions to choose a new password.
          </Text>
          <Button
            title="Return to Sign In"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <>
          <InputField
            label="Email or Phone"
            placeholder="e.g. diane.uwase@example.rw"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          <Button
            title="Send Recovery Instructions"
            onPress={handleReset}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />
        </>
      )}
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
    marginBottom: THEME.spacing.xl,
    marginTop: THEME.spacing.lg,
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
  submitBtn: {
    marginTop: THEME.spacing.md,
  },
  successBox: {
    backgroundColor: THEME.colors.successSoft,
    padding: 16,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.success,
    marginBottom: 6,
  },
  successText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
});
