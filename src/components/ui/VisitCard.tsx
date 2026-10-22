import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { VisitRequest } from '../../types/domain';
import { Card } from './Card';
import { Badge } from './Badge';

interface VisitCardProps {
  visit: VisitRequest;
  onPress: () => void;
  viewerRole: 'patient' | 'doctor';
  onActionPress?: () => void;
  actionLabel?: string;
}

export const VisitCard: React.FC<VisitCardProps> = ({
  visit,
  onPress,
  viewerRole,
  onActionPress,
  actionLabel,
}) => {
  const isDoctor = viewerRole === 'doctor';
  const personName = isDoctor ? visit.patientName : visit.doctorName;
  const personSub = isDoctor ? visit.patientPhone : visit.doctorSpecialty;

  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.dateBadge}>
          <Ionicons name="calendar-outline" size={14} color={THEME.colors.primary} />
          <Text style={styles.dateText}>{visit.scheduledDate}</Text>
          <Ionicons name="time-outline" size={14} color={THEME.colors.primary} style={{ marginLeft: 4 }} />
          <Text style={styles.timeText}>{visit.scheduledTime}</Text>
        </View>
        <Badge status={visit.status} size="sm" />
      </View>

      <View style={styles.personSection}>
        <Text style={styles.roleLabel}>{isDoctor ? 'Patient' : 'Attending Specialist'}</Text>
        <Text style={styles.personName}>{personName}</Text>
        <Text style={styles.personSub}>{personSub}</Text>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={14} color={THEME.colors.textSecondary} style={{ marginRight: 4 }} />
        <Text style={styles.addressText} numberOfLines={1}>
          {visit.visitAddress} ({visit.district})
        </Text>
      </View>

      <Text style={styles.conditionSnippet} numberOfLines={1}>
        Symptoms: {visit.conditionDescription}
      </Text>

      {visit.status === 'alternative_proposed' && (
        <View style={styles.alternativeAlert}>
          <Text style={styles.alternativeAlertText}>
            Proposed Time: {visit.alternativeDate} at {visit.alternativeTime}
          </Text>
          {visit.alternativeProposalNote && (
            <Text style={styles.alternativeNote}>"{visit.alternativeProposalNote}"</Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.feeText}>
          Total: <Text style={styles.feeHighlight}>{visit.totalFeeRwf.toLocaleString()} RWF</Text>
        </Text>

        {actionLabel && onActionPress ? (
          <Pressable
            onPress={onActionPress}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.actionBtnText}>{actionLabel}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onPress}>
            <Text style={styles.detailsLink}>View Details ›</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: THEME.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    fontSize: 13,
  },
  timeText: {
    color: THEME.colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  personSection: {
    marginVertical: 4,
  },
  roleLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  personSub: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  addressIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  addressText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  conditionSnippet: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  alternativeAlert: {
    backgroundColor: '#FEF9C3',
    padding: 8,
    borderRadius: THEME.borderRadius.sm,
    marginVertical: 6,
  },
  alternativeAlertText: {
    color: '#854D0E',
    fontWeight: '700',
    fontSize: 12,
  },
  alternativeNote: {
    color: '#713F12',
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: THEME.colors.borderLight,
    paddingTop: 8,
    marginTop: 4,
  },
  feeText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  feeHighlight: {
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  detailsLink: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
