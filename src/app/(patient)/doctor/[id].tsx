// Doctor Details Profile Screen (SRS FR-2.2, FR-2.5)
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '../../../constants/theme';
import { patientService } from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function DoctorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['doctor-details', id],
    queryFn: () => patientService.getDoctorDetails(id || ''),
    enabled: !!id,
  });

  if (isLoading || !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading physician profile...</Text>
      </View>
    );
  }

  const { doctor, slots, reviews } = data;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Header */}
      <View style={styles.headerCard}>
        <Image
          source={{
            uri:
              doctor.avatarUrl ||
              'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&q=80',
          }}
          style={styles.avatar}
        />
        <View style={styles.nameRow}>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          {doctor.verificationStatus === 'approved' && (
            <View style={styles.verifiedDot}>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
          )}
        </View>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        <Text style={styles.licenseText}>License: {doctor.licenseNumber}</Text>

        <View style={styles.ratingRow}>
          <Text style={styles.starText}>★ {doctor.rating.toFixed(1)}</Text>
          <Text style={styles.reviewsCount}>({doctor.reviewCount} home visits)</Text>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.expText}>{doctor.experienceYears} Years Clinical Exp</Text>
        </View>
      </View>

      {/* Fees Card */}
      <Card style={styles.feeCard}>
        <View style={styles.feeCol}>
          <Text style={styles.feeLabel}>Home Consultation</Text>
          <Text style={styles.feeVal}>{doctor.consultationFeeRwf.toLocaleString()} RWF</Text>
        </View>
        <View style={styles.feeDivider} />
        <View style={styles.feeCol}>
          <Text style={styles.feeLabel}>Kigali Travel Fee</Text>
          <Text style={styles.feeVal}>{doctor.travelFeeRwf.toLocaleString()} RWF</Text>
        </View>
      </Card>

      {/* Qualifications & Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About the Specialist</Text>
        <Text style={styles.bioText}>{doctor.bio}</Text>
      </View>

      {/* Qualifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Qualifications & Credentials</Text>
        {doctor.qualifications.map((q: string, idx: number) => (
          <View key={idx} style={styles.bulletRow}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>{q}</Text>
          </View>
        ))}
      </View>

      {/* Coverage & Languages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Coverage & Languages</Text>
        <View style={styles.tagGroup}>
          <Text style={styles.tagLabel}>Districts:</Text>
          {doctor.coverageDistricts.map((d: string) => (
            <View key={d} style={styles.tagChip}>
              <Text style={styles.tagText}>📍 {d}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.tagGroup, { marginTop: 8 }]}>
          <Text style={styles.tagLabel}>Languages:</Text>
          {doctor.languages.map((l: string) => (
            <View key={l} style={styles.tagChip}>
              <Text style={styles.tagText}>🗣️ {l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Patient Reviews */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verified Patient Reviews ({reviews.length})</Text>
        {reviews.length === 0 ? (
          <Text style={styles.emptyReviews}>No reviews yet for this doctor.</Text>
        ) : (
          reviews.map((rev: any) => (
            <Card key={rev.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{rev.patientName}</Text>
                <Text style={styles.reviewStars}>★ {rev.rating}/5</Text>
              </View>
              <Text style={styles.reviewComment}>"{rev.comment}"</Text>
              <Text style={styles.reviewDate}>{rev.createdAt.split('T')[0]}</Text>
            </Card>
          ))
        )}
      </View>

      {/* Fixed Booking Action */}
      <View style={styles.actionContainer}>
        <Button
          title={`Book Home Visit (${(doctor.consultationFeeRwf + doctor.travelFeeRwf).toLocaleString()} RWF)`}
          size="lg"
          onPress={() => router.push(`/(patient)/book/${doctor.userId}` as any)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.background,
  },
  loadingText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
  },
  headerCard: {
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: THEME.spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorName: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  verifiedDot: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  checkIcon: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  specialty: {
    fontSize: 14,
    color: THEME.colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  licenseText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  starText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  reviewsCount: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginLeft: 4,
  },
  bullet: {
    marginHorizontal: 6,
    color: THEME.colors.border,
  },
  expText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  feeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.primarySoft,
    borderColor: '#CCFBF1',
  },
  feeCol: {
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 11,
    color: THEME.colors.primaryDark,
    fontWeight: '600',
  },
  feeVal: {
    fontSize: 16,
    fontWeight: '800',
    color: THEME.colors.primaryDark,
    marginTop: 2,
  },
  feeDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#99F6E4',
  },
  section: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  bioText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 19,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletPoint: {
    color: THEME.colors.primary,
    fontSize: 16,
    marginRight: 6,
    lineHeight: 18,
  },
  bulletText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  tagGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginRight: 4,
  },
  tagChip: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  reviewCard: {
    marginTop: 8,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  reviewStars: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  reviewComment: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  reviewDate: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  emptyReviews: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  actionContainer: {
    marginTop: THEME.spacing.md,
  },
});
