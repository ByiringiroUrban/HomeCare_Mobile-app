// Password Reset with emailed one-time code (SRS FR-1.3)
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { THEME } from '../../constants/theme';
import { authService, PasswordResetInfo } from '../../services/api';
import { InputField } from '../../components/ui/InputField';
import { Button } from '../../components/ui/Button';

type Step = 'request' | 'reset' | 'done';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [info, setInfo] = useState<PasswordResetInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleRequest = async () => {
    if (!identifier.trim()) {
      setErrorMsg('Please enter your email or phone number.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const result = await authService.requestPasswordReset(identifier.trim());
      setInfo(result);
      setStep('reset');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not send the reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMsg('');
    try {
      const result = await authService.requestPasswordReset(identifier.trim());
      setInfo(result);
      alert('A new 6-digit code has been sent.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  };

  const handleReset = async () => {
    if (code.trim().length !== 6) {
      setErrorMsg('Enter the 6-digit code from your email.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Your new password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('The two passwords do not match.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await authService.resetPasswordWithCode({
        identifier: identifier.trim(),
        code: code.trim(),
        newPassword: password,
      });
      setStep('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not reset the password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>{step === 'done' ? 'Password Updated' : 'Reset Password'}</Text>
        <Text style={styles.subtitle}>
          {step === 'request'
            ? 'Enter the email or phone number on your account and we will email you a 6-digit reset code.'
            : step === 'reset'
            ? info?.destination
              ? `We emailed a 6-digit code to ${info.destination}. It expires in ${
                  info.expiresInMinutes || 10
                } minutes.`
              : 'If the account exists, a 6-digit code has been emailed to the registered address.'
            : 'Your new password is active. Sign in with it to continue.'}
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {step === 'request' ? (
        <>
          <InputField
            label="Email or Phone"
            placeholder="e.g. diane.uwase@example.rw"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Button
            title="Send Reset Code"
            onPress={handleRequest}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Back to Sign In</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {step === 'reset' ? (
        <>
          <InputField
            label="6-Digit Reset Code"
            placeholder="123456"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />

          <InputField
            label="New Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            hint="Minimum 8 characters"
          />

          <InputField
            label="Confirm New Password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <Button
            title="Set New Password"
            onPress={handleReset}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn’t receive the code? </Text>
            <Pressable onPress={handleResend} disabled={resending}>
              <Text style={styles.resendLink}>{resending ? 'Sending…' : 'Resend Code'}</Text>
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Back to Sign In</Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {step === 'done' ? (
        <>
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>Password changed</Text>
            <Text style={styles.successText}>
              You can now sign in with your new password.
            </Text>
          </View>
          <Button
            title="Return to Sign In"
            onPress={() => router.replace('/(auth)/login')}
            size="lg"
            style={styles.submitBtn}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    flexGrow: 1,
    paddingBottom: THEME.spacing.xxl,
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
    marginTop: 6,
    lineHeight: 19,
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
  submitBtn: {
    marginTop: THEME.spacing.md,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: THEME.spacing.lg,
  },
  resendText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  resendLink: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  footerRow: {
    alignItems: 'center',
    marginTop: THEME.spacing.lg,
  },
  footerLink: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600',
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
