import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { DoctorProfile } from '../../types/domain';
import { Card } from './Card';
import { Badge } from './Badge';

interface DoctorCardProps {
  doctor: DoctorProfile;
  onPress: () => void;
  onBookPress?: () => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({
  doctor,
  onPress,
  onBookPress,
}) => {
  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <Image
          source={{
            uri:
              doctor.avatarUrl ||
              'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80',
          }}
          style={styles.avatar}
        />
        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {doctor.name}
            </Text>
            {doctor.verificationStatus === 'approved' && (
              <Ionicons
                name="checkmark-circle"
                size={17}
                color={THEME.colors.primary}
                style={{ marginLeft: 5 }}
              />
            )}
          </View>
          <Text style={styles.specialty}>{doctor.specialty}</Text>
          <View style={styles.metricsRow}>
            <Ionicons name="star" size={13} color="#D97706" style={{ marginRight: 2 }} />
            <Text style={styles.ratingText}>{doctor.rating.toFixed(1)}</Text>
            <Text style={styles.reviewsCount}>({doctor.reviewCount} visits)</Text>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.expText}>{doctor.experienceYears} yrs exp</Text>
          </View>
        </View>
      </View>

      <Text style={styles.bio} numberOfLines={2}>
        {doctor.bio}
      </Text>

      <View style={styles.districtChipsRow}>
        {doctor.coverageDistricts.map((district) => (
          <View key={district} style={styles.districtChip}>
            <Ionicons name="location-sharp" size={12} color={THEME.colors.primary} style={{ marginRight: 3 }} />
            <Text style={styles.districtText}>{district}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.feeLabel}>Home Consultation</Text>
          <Text style={styles.feeAmount}>
            {doctor.consultationFeeRwf.toLocaleString()} RWF
          </Text>
        </View>

        <Pressable
          onPress={onBookPress || onPress}
          style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.bookBtnText}>Book Visit</Text>
        </Pressable>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: THEME.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: THEME.spacing.sm,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.colors.surfaceSubtle,
    marginRight: THEME.spacing.md,
  },
  mainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    flexShrink: 1,
  },
  verifiedDot: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  verifiedCheck: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  specialty: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  reviewsCount: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  bullet: {
    marginHorizontal: 6,
    color: THEME.colors.border,
  },
  expText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  bio: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginVertical: THEME.spacing.xs,
  },
  districtChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
  },
  districtChip: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  districtText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: THEME.spacing.sm,
    borderTopWidth: 1,
    borderColor: THEME.colors.borderLight,
    marginTop: 6,
  },
  feeLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  feeAmount: {
    fontSize: THEME.typography.sizes.md,
    fontWeight: '700',
    color: THEME.colors.primaryDark,
  },
  bookBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: THEME.borderRadius.md,
  },
  bookBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
