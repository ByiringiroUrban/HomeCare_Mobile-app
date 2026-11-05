// Administration Console Layout — admin-only route guard
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { THEME } from '../../constants/theme';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';

export default function AdminLayout() {
  const isAuthorised = useProtectedRoute('admin');

  // Render a blank loading screen while the redirect fires
  if (!isAuthorised) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

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

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
