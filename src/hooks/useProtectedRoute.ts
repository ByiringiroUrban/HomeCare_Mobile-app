// Role-based route protection hook
// Runs on every render inside a protected group layout.
// If the current user does not have the required role they are immediately
// redirected to the welcome screen, preventing unauthorised access.
import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

type AllowedRole = 'patient' | 'doctor' | 'admin';

export function useProtectedRoute(allowedRole: AllowedRole) {
  const { currentUser } = useAuthStore();

  useEffect(() => {
    // Not logged in at all → back to welcome
    if (!currentUser) {
      router.replace('/(auth)/welcome');
      return;
    }

    // Logged in but wrong role → redirect to their own dashboard
    if (currentUser.role !== allowedRole) {
      if (currentUser.role === 'patient') {
        router.replace('/(patient)');
      } else if (currentUser.role === 'doctor') {
        router.replace('/(doctor)');
      } else if (currentUser.role === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [currentUser, allowedRole]);

  // Returns true only when the user is authorised — layouts can use this
  // to avoid rendering sensitive UI before the redirect fires.
  return currentUser?.role === allowedRole;
}

