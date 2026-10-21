// Doctor Schedule & Availability Slot Manager (SRS FR-4.1)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { doctorService } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DoctorScheduleScreen() {
  const { currentUser, doctorProfile } = useAuthStore();
  const [newDate, setNewDate] = useState('2026-10-23');
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('15:00');
  const [addingSlot, setAddingSlot] = useState(false);

  const { data: slots = [], refetch } = useQuery({
    queryKey: ['doctor-slots', currentUser?.id],
    queryFn: () => doctorService.getSlots(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  const handleAddSlot = async () => {
    if (!newDate || !startTime || !endTime) {
      alert('Please enter date, start time, and end time.');
      return;
    }
    setAddingSlot(true);
    try {
      await doctorService.addSlot(currentUser?.id || '', newDate, startTime, endTime);
      alert(`New availability slot added for ${newDate} (${startTime} - ${endTime})`);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Cannot add slot');
    } finally {
      setAddingSlot(false);
    }
  };

  const handleRemoveSlot = async (slotId: string) => {
    try {
      await doctorService.removeSlot(slotId);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Cannot remove slot');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Availability & Slot Schedule</Text>
      <Text style={styles.headerSubtitle}>
        Define your working windows in Kigali. Booked slots are automatically reserved.
      </Text>

      {/* Routine Working Days & Hours */}
      <Card style={styles.workingCard}>
        <Text style={styles.cardTitle}>Default Weekly Working Days</Text>
        <View style={styles.daysRow}>
          {DAYS_OF_WEEK.map((day, idx) => {
            const isActive = doctorProfile?.workingDays?.includes(idx);
            return (
              <View
                key={day}
                style={[styles.dayCircle, isActive && styles.dayCircleActive]}
              >
                <Text style={[styles.dayText, isActive && styles.dayTextActive]}>{day}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.hoursText}>
          Working Hours: {doctorProfile?.workingHours?.start || '08:00'} -{' '}
          {doctorProfile?.workingHours?.end || '18:00'}
        </Text>
      </Card>

      {/* Existing Specific Slots */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Open Time Slots ({slots.length})</Text>

        {slots.length === 0 ? (
          <Text style={styles.emptyText}>No slots created yet. Add one below.</Text>
        ) : (
          slots.map((s) => (
            <Card key={s.id} style={styles.slotCard}>
              <View style={styles.slotInfo}>
                <Text style={styles.slotDate}>{s.date}</Text>
                <Text style={styles.slotTime}>
                  ⏱️ {s.startTime} - {s.endTime}
                </Text>
                <Text
                  style={[
                    styles.slotStatus,
                    s.isBooked ? styles.statusBooked : styles.statusOpen,
                  ]}
                >
                  {s.isBooked ? '● Booked by Patient' : '○ Open for Booking'}
                </Text>
              </View>

              {!s.isBooked && (
                <Pressable
                  onPress={() => handleRemoveSlot(s.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteText}>Remove</Text>
                </Pressable>
              )}
            </Card>
          ))
        )}
      </View>

      {/* Add New Slot Form */}
      <Card style={styles.addSlotCard}>
        <Text style={styles.cardTitle}>Add Open Consultation Slot</Text>
        <InputField
          label="Date (YYYY-MM-DD)"
          value={newDate}
          onChangeText={setNewDate}
        />
        <View style={styles.timeRow}>
          <InputField
            label="Start Time (HH:mm)"
            value={startTime}
            onChangeText={setStartTime}
            containerStyle={{ flex: 1 }}
          />
          <InputField
            label="End Time (HH:mm)"
            value={endTime}
            onChangeText={setEndTime}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <Button
          title="Add Availability Slot"
          onPress={handleAddSlot}
          loading={addingSlot}
          size="md"
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.base,
    backgroundColor: THEME.colors.background,
    paddingBottom: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    marginBottom: THEME.spacing.md,
  },
  workingCard: {
    marginBottom: THEME.spacing.md,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: THEME.colors.primary,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  dayTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  hoursText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
  },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slotInfo: {
    flex: 1,
  },
  slotDate: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  slotTime: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  slotStatus: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  statusBooked: {
    color: THEME.colors.error,
  },
  statusOpen: {
    color: THEME.colors.success,
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteText: {
    color: THEME.colors.error,
    fontSize: 11,
    fontWeight: '600',
  },
  addSlotCard: {
    backgroundColor: THEME.colors.surface,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
