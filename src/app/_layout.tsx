// Root Layout with Safe Area, QueryClient, and Demo Switching Header
import React, { useState } from 'react';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { THEME } from '../constants/theme';
import { SplashPreloader } from '../components/SplashPreloader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});

function DemoSwitchBanner() {
  const { currentUser, logout, loginDemo, resetDemoData } = useAuthStore();

  if (!currentUser) return null;

  return (
    <View style={styles.demoBar}>
      <View style={styles.userBadge}>
        <Text style={styles.roleTag}>
          {currentUser.role.toUpperCase()}: {currentUser.name}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            resetDemoData();
            alert('Demo data has been reset to default state.');
          }}
          style={styles.actionBtn}
        >
          <Text style={styles.actionText}>Reset Data</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            logout();
            router.replace('/(auth)/welcome');
          }}
          style={[styles.actionBtn, styles.logoutBtn]}
        >
          <Text style={styles.logoutText}>Switch Account</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <View style={styles.container}>
          <DemoSwitchBanner />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: THEME.colors.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(patient)" />
            <Stack.Screen name="(doctor)" />
            <Stack.Screen name="(admin)" />
          </Stack>
        </View>

        {/* Animated HomeCare Brand Splash Preloader */}
        {showSplash && <SplashPreloader onFinish={() => setShowSplash(false)} />}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  demoBar: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 999,
  },
  userBadge: {
    flex: 1,
  },
  roleTag: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
  },
  logoutBtn: {
    backgroundColor: '#B91C1C',
  },
  logoutText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
