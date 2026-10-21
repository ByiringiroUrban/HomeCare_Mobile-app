// Doctor Experience Tab Layout (Dashboard, Requests, Schedule, Patients, Profile)
import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { THEME } from '../../constants/theme';

export default function DoctorTabsLayout() {
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
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          headerTitle: 'Patient Visit Requests',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📬</Text>,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          headerTitle: 'Availability & Slots',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⏱️</Text>,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          headerTitle: 'Assigned Patients',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👥</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Doctor Credentials & Status',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🩺</Text>,
        }}
      />

      {/* Subroutes */}
      <Tabs.Screen name="visit/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="consultation/[visitId]" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
