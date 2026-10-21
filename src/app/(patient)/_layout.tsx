// Patient App Tab Layout (Home, Find Doctor, Visits, Records, Profile)
import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { THEME } from '../../constants/theme';

export default function PatientTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: THEME.colors.textMuted,
        tabBarStyle: {
          backgroundColor: THEME.colors.surface,
          borderTopColor: THEME.colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: THEME.colors.surface,
        },
        headerTitleStyle: {
          fontWeight: '700',
          color: THEME.colors.textPrimary,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="doctors"
        options={{
          title: 'Find Doctor',
          headerTitle: 'Find Medical Specialists',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🔍</Text>,
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Visits',
          headerTitle: 'My Consultations',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🗓️</Text>,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          headerTitle: 'Medical History & Results',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Medical Profile & Settings',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text>,
        }}
      />

      {/* Hidden subroutes from the tab bar */}
      <Tabs.Screen name="doctor/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="book/[doctorId]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="visit/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="result/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="notifications" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
