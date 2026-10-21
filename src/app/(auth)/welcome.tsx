// Welcome & Onboarding Screen with Quick Demo Selectors
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME, APP_CONFIG } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmergencyBanner } from '../../components/ui/EmergencyBanner';

export default function WelcomeScreen() {
  const { loginDemo, isLoading } = useAuthStore();

  const handleSelectDemo = async (role: 'patient1' | 'patient2' | 'doctor1' | 'doctor2' | 'admin') => {
    try {
      const user = await loginDemo(role);
      if (user.role === 'patient') {
        router.replace('/(patient)');
      } else if (user.role === 'doctor') {
        router.replace('/(doctor)');
      } else if (user.role === 'admin') {
        router.replace('/(admin)');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to sign in demo user');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Branding with Official Logo */}
        <View style={styles.brandHeader}>
          <Image
            source={require('../../../assets/homecare-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>{APP_CONFIG.tagline}</Text>
        </View>

        {/* Emergency Disclaimer Banner */}
        <EmergencyBanner />

        {/* Feature Highlights */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏡</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Consultations At Your Residence</Text>
              <Text style={styles.featureDesc}>
                Licensed specialist physicians travel directly to your home in Kigali.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🧪</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Home Specimen Lab Collection</Text>
              <Text style={styles.featureDesc}>
                Doctors collect routine blood and swab samples on-site and deliver them to partner labs.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📄</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Instant Records & PDF Results</Text>
              <Text style={styles.featureDesc}>
                Access electronic prescriptions, consultation summaries, and downloadable PDF reports.
              </Text>
            </View>
          </View>
        </View>

        {/* Standard Authentication Actions */}
        <View style={styles.authButtons}>
          <Button
            title="Sign In to Your Account"
            onPress={() => router.push('/(auth)/login')}
            size="lg"
            style={styles.mainBtn}
          />
          <View style={styles.registerRow}>
            <Button
              title="Register as Patient"
              variant="outline"
              size="md"
              onPress={() => router.push('/(auth)/register-patient')}
              style={styles.halfBtn}
            />
            <Button
              title="Doctor Onboarding"
              variant="secondary"
              size="md"
              onPress={() => router.push('/(auth)/register-doctor')}
              style={styles.halfBtn}
            />
          </View>
        </View>

        {/* Demo Fast-Track Accounts Panel */}
        <Card style={styles.demoCard}>
          <View style={styles.demoHeader}>
            <Text style={styles.demoTitle}>DEVELOPMENT & EVALUATION ACCOUNTS</Text>
            <Text style={styles.demoSubtitle}>
              Tap any pre-configured role to immediately enter complete interactive flows:
            </Text>
          </View>

          <View style={styles.demoButtonGroup}>
            <Text style={styles.roleGroupLabel}>PATIENTS</Text>
            <Pressable
              style={styles.demoBtn}
              onPress={() => handleSelectDemo('patient1')}
              disabled={isLoading}
            >
              <Text style={styles.demoBtnTitle}>Diane Uwase (Patient 1)</Text>
              <Text style={styles.demoBtnDesc}>Kibagabaga • Has completed visit + Active visit</Text>
            </Pressable>

            <Pressable
              style={styles.demoBtn}
              onPress={() => handleSelectDemo('patient2')}
              disabled={isLoading}
            >
              <Text style={styles.demoBtnTitle}>Jean-Paul Mugisha (Patient 2)</Text>
              <Text style={styles.demoBtnDesc}>Gikondo • Has pending visit request with Dr. Aline</Text>
            </Pressable>

            <Text style={styles.roleGroupLabel}>SPECIALIST DOCTORS</Text>
            <Pressable
              style={styles.demoBtn}
              onPress={() => handleSelectDemo('doctor1')}
              disabled={isLoading}
            >
              <Text style={styles.demoBtnTitle}>Dr. Eric Kayitare (General Medicine)</Text>
              <Text style={styles.demoBtnDesc}>Assigned to Diane • Active "On the way" visit</Text>
            </Pressable>

            <Pressable
              style={styles.demoBtn}
              onPress={() => handleSelectDemo('doctor2')}
              disabled={isLoading}
            >
              <Text style={styles.demoBtnTitle}>Dr. Aline Mukeshimana (Pediatrics)</Text>
              <Text style={styles.demoBtnDesc}>Pending request review & alternative slot demo</Text>
            </Pressable>

            <Text style={styles.roleGroupLabel}>ADMINISTRATION CONSOLE</Text>
            <Pressable
              style={[styles.demoBtn, styles.adminBtn]}
              onPress={() => handleSelectDemo('admin')}
              disabled={isLoading}
            >
              <Text style={styles.adminBtnTitle}>Platform Compliance Administrator</Text>
              <Text style={styles.adminBtnDesc}>Doctor credential review, audit logs & metrics</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scrollContent: {
    paddingBottom: THEME.spacing.xxl,
  },
  brandHeader: {
    alignItems: 'center',
    paddingVertical: THEME.spacing.lg,
    paddingHorizontal: THEME.spacing.base,
  },
  logoImage: {
    width: 240,
    height: 70,
    marginBottom: THEME.spacing.xs,
  },
  tagline: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  featuresSection: {
    paddingHorizontal: THEME.spacing.base,
    marginVertical: THEME.spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  featureDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  authButtons: {
    paddingHorizontal: THEME.spacing.base,
    marginVertical: THEME.spacing.md,
  },
  mainBtn: {
    marginBottom: 10,
  },
  registerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfBtn: {
    flex: 1,
  },
  demoCard: {
    marginHorizontal: THEME.spacing.base,
    marginTop: THEME.spacing.md,
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  demoHeader: {
    marginBottom: 12,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  demoSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 3,
  },
  demoButtonGroup: {
    gap: 8,
  },
  roleGroupLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  demoBtn: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
  },
  demoBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  demoBtnDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  adminBtn: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  adminBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  adminBtnDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});
