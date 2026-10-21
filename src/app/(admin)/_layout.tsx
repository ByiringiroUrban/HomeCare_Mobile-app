// Basic Administration Web Console Layout (SRS Section 9 & 4.10)
import React from 'react';
import { Stack } from 'expo-router';
import { THEME } from '../../constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#38BDF8',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: THEME.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'HomeCare Platform Administration' }} />
    </Stack>
  );
}
