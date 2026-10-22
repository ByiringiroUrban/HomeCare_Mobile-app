// Ultra-premium animated splash & branded preloader for HomeCare Rwanda
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME, APP_CONFIG } from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface SplashPreloaderProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const SplashPreloader: React.FC<SplashPreloaderProps> = ({
  onFinish,
  minDurationMs = 2400,
}) => {
  // Animation drivers
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const pulseRing1 = useRef(new Animated.Value(0.4)).current;
  const pulseRing1Opacity = useRef(new Animated.Value(0.7)).current;
  const pulseRing2 = useRef(new Animated.Value(0.2)).current;
  const pulseRing2Opacity = useRef(new Animated.Value(0.5)).current;

  const contentTranslateY = useRef(new Animated.Value(24)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const containerFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrance animation for Logo & Content
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        delay: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 800,
        delay: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: minDurationMs - 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }),
    ]).start();

    // 2. Continuous Medical Ripple effect behind logo
    const loopPulsing = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseRing1, {
              toValue: 1.6,
              duration: 2000,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseRing1Opacity, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseRing1, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(pulseRing1Opacity, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(500),
          Animated.parallel([
            Animated.timing(pulseRing2, {
              toValue: 1.8,
              duration: 2200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseRing2Opacity, {
              toValue: 0,
              duration: 2200,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseRing2, {
              toValue: 0.4,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(pulseRing2Opacity, {
              toValue: 0.5,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    );

    loopPulsing.start();

    // 3. Smooth fade out when completed
    const timer = setTimeout(() => {
      Animated.timing(containerFade, {
        toValue: 0,
        duration: 450,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        loopPulsing.stop();
        if (onFinish) onFinish();
      });
    }, minDurationMs);

    return () => {
      clearTimeout(timer);
      loopPulsing.stop();
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: containerFade }]}>
      {/* Decorative subtle ambient circles */}
      <View style={styles.topBackdropCircle} />
      <View style={styles.bottomBackdropCircle} />

      <View style={styles.centerContainer}>
        {/* Pulsing Medical Halo Rings */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseRing1 }],
              opacity: pulseRing1Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.pulseRing,
            styles.pulseRingSecondary,
            {
              transform: [{ scale: pulseRing2 }],
              opacity: pulseRing2Opacity,
            },
          ]}
        />

        {/* Central Logo Box with premium elevation */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/homecare-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand details and Tagline */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: contentOpacity,
              transform: [{ translateY: contentTranslateY }],
            },
          ]}
        >
          <View style={styles.badgeRow}>
            <Ionicons name="shield-checkmark" size={13} color={THEME.colors.primaryDark} />
            <Text style={styles.badgeLabel}>MINISANTE VERIFIED SPECIALISTS</Text>
          </View>

          <Text style={styles.appTitle}>HomeCare</Text>
          <Text style={styles.tagline}>Doctor Home Consultations • Kigali</Text>

          {/* Smooth modern progress indicator bar */}
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
          </View>

          <View style={styles.statusRow}>
            <Ionicons name="pulse" size={14} color={THEME.colors.primaryLight} style={styles.pulseIcon} />
            <Text style={styles.statusText}>Connecting to healthcare network...</Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer reassurance */}
      <Animated.View style={[styles.footer, { opacity: contentOpacity }]}>
        <View style={styles.footerRow}>
          <Ionicons name="lock-closed-outline" size={12} color={THEME.colors.textMuted} />
          <Text style={styles.footerText}>
            Rwandan Law No. 058/2021 Data Protection Compliant
          </Text>
        </View>
        <Text style={styles.emergencyDisclaimer}>
          Emergency Hotline: <Text style={styles.emergencyBold}>112 (SAMU Rwanda)</Text>
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  topBackdropCircle: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#F0FDFA',
    opacity: 0.8,
  },
  bottomBackdropCircle: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#F0FDF4',
    opacity: 0.7,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#99F6E4',
    backgroundColor: '#CCFBF133',
  },
  pulseRingSecondary: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderColor: '#A7F3D0',
    backgroundColor: '#D1FAE522',
  },
  logoContainer: {
    width: 170,
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#0F766E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
      default: {
        shadowColor: '#0F766E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
      },
    }),
  },
  logoImage: {
    width: 150,
    height: 90,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 32,
    width: '100%',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 10,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
    letterSpacing: 0.5,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    marginTop: 3,
    marginBottom: 26,
  },
  progressBarBg: {
    width: '68%',
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  pulseIcon: {
    marginTop: 1,
  },
  statusText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  emergencyDisclaimer: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  emergencyBold: {
    fontWeight: '800',
    color: THEME.colors.error,
  },
});
