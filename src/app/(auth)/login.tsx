// Login Screen with Identifier and Quick Password Reset
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { InputField } from '../../components/ui/InputField';
import { Button } from '../../components/ui/Button';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('diane.uwase@example.rw');
  const [password, setPassword] = useState('Password123!');
  const [errorMsg, setErrorMsg] = useState('');
  const { loginCustom, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!identifier.trim()) {
      setErrorMsg('Please enter your email or phone number.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setErrorMsg('');
    try {
      const user = await loginCustom(identifier.trim());
      if (user.role === 'patient') {
        router.replace('/(patient)');
      } else if (user.role === 'doctor') {
        router.replace('/(doctor)');
      } else if (user.role === 'admin') {
        router.replace('/(admin)');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Check your credentials.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../../../assets/homecare-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to access your consultations and health records</Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <InputField
        label="Email or Phone Number"
        placeholder="e.g. diane.uwase@example.rw or +250 788 412 901"
        value={identifier}
        onChangeText={setIdentifier}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <InputField
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <View style={styles.forgotRow}>
        <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={styles.forgotLink}>Forgot Password?</Text>
        </Pressable>
      </View>

      <Button
        title="Sign In"
        onPress={handleLogin}
        loading={isLoading}
        size="lg"
        style={styles.signInBtn}
      />

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Pressable onPress={() => router.push('/(auth)/register-patient')}>
          <Text style={styles.signUpLink}>Register as Patient</Text>
        </Pressable>
      </View>

      <View style={styles.helperCard}>
        <Text style={styles.helperTitle}>Quick Test Credentials:</Text>
        <Text style={styles.helperText}>Patient 1: diane.uwase@example.rw</Text>
        <Text style={styles.helperText}>Doctor 1: dr.eric@homecare.rw</Text>
        <Text style={styles.helperText}>Admin: admin@homecare.rw</Text>
        <Text style={styles.helperText}>Any password accepted for testing.</Text>
      </View>
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
    marginTop: THEME.spacing.sm,
  },
  logoImage: {
    width: 190,
    height: 55,
    marginBottom: THEME.spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 6,
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
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: THEME.spacing.lg,
  },
  forgotLink: {
    color: THEME.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  signInBtn: {
    marginBottom: THEME.spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: THEME.spacing.md,
  },
  footerText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  signUpLink: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  helperCard: {
    marginTop: THEME.spacing.xl,
    padding: 12,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.md,
  },
  helperTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 4,
  },
  helperText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
});
