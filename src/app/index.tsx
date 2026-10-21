// Root redirection gate
import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { THEME } from '../constants/theme';

export default function IndexScreen() {
  const { currentUser } = useAuthStore();

  useEffect(() => {
    // If not authenticated, route to welcome/onboarding
    if (!currentUser) {
      router.replace('/(auth)/welcome');
      return;
    }

    if (currentUser.role === 'patient') {
      router.replace('/(patient)');
    } else if (currentUser.role === 'doctor') {
      router.replace('/(doctor)');
    } else if (currentUser.role === 'admin') {
      router.replace('/(admin)');
    }
  }, [currentUser]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={THEME.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
