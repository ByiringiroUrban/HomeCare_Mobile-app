// Email OTP Verification (SRS FR-1.2)
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { THEME } from '../../constants/theme';
import { authService } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';

export default function OtpVerificationScreen() {
  const { userId, destination } = useLocalSearchParams<{
    userId: string;
    destination: string;
    role: string;
  }>();

  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { setSession } = useAuthStore();

  const handleVerify = async () => {
    if (otpCode.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    if (!userId) {
      setErrorMsg('This verification link is incomplete. Please sign in again.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setNotice('');
    try {
      const { user, token } = await authService.verifyOtp(otpCode.trim(), userId);
      await setSession(user, token);

      if (user.role === 'patient') {
        router.replace('/(patient)');
      } else if (user.role === 'doctor') {
        router.replace('/(doctor)');
      } else {
        router.replace('/(admin)');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userId) return;
    setResending(true);
    setErrorMsg('');
    setNotice('');
    try {
      const result = await authService.resendOtp(userId);
      setNotice(
        result.destination
          ? `A new code was sent to ${result.destination}.`
          : 'A new code has been sent if the account is awaiting verification.'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We emailed a 6-digit one-time code to{' '}
          <Text style={styles.destHighlight}>{destination || 'your registered address'}</Text>. It
          expires in 10 minutes.
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {notice ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.otpInput}
        value={otpCode}
        onChangeText={setOtpCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
        placeholderTextColor={THEME.colors.textMuted}
        autoFocus
      />

      <Button
        title="Verify & Continue"
        onPress={handleVerify}
        loading={loading}
        size="lg"
        style={styles.verifyBtn}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
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
    lineHeight: 18,
  },
  destHighlight: {
    color: THEME.colors.textPrimary,
    fontWeight: '700',
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
  noticeBox: {
    backgroundColor: THEME.colors.primarySoft,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 16,
  },
  noticeText: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  otpInput: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
    textAlign: 'center',
    color: THEME.colors.textPrimary,
    marginBottom: 16,
  },
  verifyBtn: {
    marginBottom: THEME.spacing.lg,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    marginTop: THEME.spacing.xl,
  },
  footerLink: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
});
