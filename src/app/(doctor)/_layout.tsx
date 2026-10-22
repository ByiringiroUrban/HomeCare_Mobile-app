import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          headerTitle: 'Patient Visit Requests',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'mail-unread' : 'mail-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          headerTitle: 'Availability & Slots',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Patients',
          headerTitle: 'Assigned Patients',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Doctor Credentials & Status',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'medkit' : 'medkit-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />

      {/* Subroutes */}
      <Tabs.Screen name="visit/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="consultation/[visitId]" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
