// Basic Administration Web Console Layout (SRS Section 9 & 4.10)
import React from 'react';
import { Stack } from 'expo-router';
import { THEME } from '../../constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: THEME.colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'HomeCare Platform Administration', headerShown: false }} />
    </Stack>
  );
}
