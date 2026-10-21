// Auth Stack Layout
import React from 'react';
import { Stack } from 'expo-router';
import { THEME } from '../../constants/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: THEME.colors.surface },
        headerTintColor: THEME.colors.primary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: THEME.colors.background },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Sign In' }} />
      <Stack.Screen name="register-patient" options={{ title: 'Patient Registration' }} />
      <Stack.Screen name="register-doctor" options={{ title: 'Doctor Registration' }} />
      <Stack.Screen name="otp-verification" options={{ title: 'Verify OTP' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password' }} />
    </Stack>
  );
}
