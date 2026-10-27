// Welcome & Onboarding Screen
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
import { Ionicons } from '@expo/vector-icons';
import { THEME, APP_CONFIG } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { EmergencyBanner } from '../../components/ui/EmergencyBanner';

export default function WelcomeScreen() {


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

        {/* Feature Highlights - Clean & Minimal Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroHeadline}>Quality Healthcare Delivered to Your Home</Text>
          <Text style={styles.heroSubheadline}>
            Connect with certified doctors across Kigali for convenient in-person medical consultations and lab collections.
          </Text>
        </View>

        {/* Core Value Pills */}
        <View style={styles.benefitsRow}>
          <View style={styles.benefitPill}>
            <Ionicons name="home-outline" size={16} color={THEME.colors.primary} />
            <Text style={styles.benefitPillText}>At Home</Text>
          </View>
          <View style={styles.benefitPill}>
            <Ionicons name="shield-checkmark-outline" size={16} color={THEME.colors.primary} />
            <Text style={styles.benefitPillText}>Verified MDs</Text>
          </View>
          <View style={styles.benefitPill}>
            <Ionicons name="document-text-outline" size={16} color={THEME.colors.primary} />
            <Text style={styles.benefitPillText}>Digital Rx</Text>
          </View>
        </View>

        {/* Primary Action Buttons */}
        <View style={styles.authButtons}>
          <Button
            title="Create Patient Account"
            onPress={() => router.push('/(auth)/register-patient')}
            size="lg"
            style={styles.mainBtn}
          />
          <Button
            title="Sign In"
            variant="outline"
            size="lg"
            onPress={() => router.push('/(auth)/login')}
            style={styles.secondaryBtn}
          />
        </View>

        {/* Subtle Doctor Link at bottom */}
        <View style={styles.doctorFooter}>
          <Text style={styles.doctorFooterText}>Are you a licensed physician? </Text>
          <Pressable onPress={() => router.push('/(auth)/register-doctor')}>
            <Text style={styles.doctorLink}>Doctor Onboarding ›</Text>
          </Pressable>
        </View>
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
  heroSection: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.md,
    alignItems: 'center',
  },
  heroHeadline: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 8,
  },
  heroSubheadline: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: THEME.spacing.sm,
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: THEME.spacing.base,
    marginBottom: THEME.spacing.lg,
  },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.primarySoft,
    borderColor: '#CCFBF1',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
    gap: 6,
  },
  benefitPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  authButtons: {
    paddingHorizontal: THEME.spacing.base,
    marginVertical: THEME.spacing.sm,
    gap: 12,
  },
  mainBtn: {
    width: '100%',
  },
  secondaryBtn: {
    width: '100%',
  },
  doctorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.xl,
  },
  doctorFooterText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  doctorLink: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
});

