// OTP Verification Screen with Simulated Demo Code (SRS FR-1.2)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { THEME, APP_CONFIG } from '../../constants/theme';
import { authService } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';

export default function OtpVerificationScreen() {
  const { userId, destination, role } = useLocalSearchParams<{
    userId: string;
    destination: string;
    role: string;
  }>();

  const [otpCode, setOtpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginCustom } = useAuthStore();

  const handleVerify = async () => {
    if (otpCode.length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const isValid = await authService.verifyOtp(otpCode, userId || '');
      if (!isValid) {
        setErrorMsg('Invalid verification code. Please try again.');
        setLoading(false);
        return;
      }

      // Log in user
      if (userId) {
        const user = await authService.getCurrentUser(userId);
        if (user) {
          await loginCustom(user.email || user.phone);
          if (user.role === 'patient') {
            router.replace('/(patient)');
          } else if (user.role === 'doctor') {
            router.replace('/(doctor)');
          } else {
            router.replace('/(admin)');
          }
          return;
        }
      }

      router.replace('/(auth)/login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFastFill = () => {
    setOtpCode(APP_CONFIG.demoOtpCode);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit one-time code to{' '}
          <Text style={styles.destHighlight}>{destination || 'your registered phone/email'}</Text>.
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
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

      <Pressable onPress={handleFastFill} style={styles.fastFillBox}>
        <Text style={styles.fastFillText}>
          Demo Hint: Tap here to insert demo code ({APP_CONFIG.demoOtpCode})
        </Text>
      </Pressable>

      <Button
        title="Verify & Continue"
        onPress={handleVerify}
        loading={loading}
        size="lg"
        style={styles.verifyBtn}
      />

      <View style={styles.resendRow}>
        <Text style={styles.resendText}>Didn't receive code? </Text>
        <Pressable onPress={() => alert('New simulated code sent: 123456')}>
          <Text style={styles.resendLink}>Resend Code</Text>
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
    marginBottom: 12,
  },
  fastFillBox: {
    padding: 10,
    backgroundColor: THEME.colors.primarySoft,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  fastFillText: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '700',
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
});
