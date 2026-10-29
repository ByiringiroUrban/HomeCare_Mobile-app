// Login Screen
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
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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
      const user = await loginCustom(identifier.trim(), password.trim());
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
        placeholder="e.g. email@example.com or +250 788 000 000"
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
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.lg,
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
});
