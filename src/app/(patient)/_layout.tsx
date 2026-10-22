import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="doctors"
        options={{
          title: 'Find Doctor',
          headerTitle: 'Find Medical Specialists',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Visits',
          headerTitle: 'My Consultations',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size || 22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: 'Records',
          headerTitle: 'Medical History & Results',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
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
          headerTitle: 'Medical Profile & Settings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size || 22} color={color} />
          ),
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
