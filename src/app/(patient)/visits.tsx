// Patient Visits List Screen (SRS FR-3.6, FR-7.2)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { THEME } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { patientService } from '../../services/api';
import { VisitCard } from '../../components/ui/VisitCard';

export default function PatientVisitsScreen() {
  const { currentUser } = useAuthStore();
  const [filterTab, setFilterTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const { data: visits = [], isLoading, refetch } = useQuery({
    queryKey: ['patient-visits', currentUser?.id],
    queryFn: () => patientService.getVisits(currentUser?.id || ''),
    enabled: !!currentUser,
  });

  const filteredVisits = visits.filter((v) => {
    const isUpcoming = [
      'pending',
      'alternative_proposed',
      'confirmed',
      'on_the_way',
      'arrived',
      'in_consultation',
    ].includes(v.status);

    if (filterTab === 'upcoming') return isUpcoming;
    if (filterTab === 'past') return !isUpcoming;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, filterTab === 'upcoming' && styles.tabActive]}
          onPress={() => setFilterTab('upcoming')}
        >
          <Text style={[styles.tabText, filterTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming & Active
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, filterTab === 'past' && styles.tabActive]}
          onPress={() => setFilterTab('past')}
        >
          <Text style={[styles.tabText, filterTab === 'past' && styles.tabTextActive]}>
            Past & Completed
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, filterTab === 'all' && styles.tabActive]}
          onPress={() => setFilterTab('all')}
        >
          <Text style={[styles.tabText, filterTab === 'all' && styles.tabTextActive]}>
            All ({visits.length})
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filteredVisits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={refetch}
        refreshing={isLoading}
        renderItem={({ item }) => (
          <VisitCard
            visit={item}
            viewerRole="patient"
            onPress={() => router.push(`/(patient)/visit/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>No consultations found</Text>
            <Text style={styles.emptyText}>
              {filterTab === 'upcoming'
                ? 'You do not have any pending or active doctor visits.'
                : 'No historical visits recorded yet.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    padding: 8,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: THEME.colors.primarySoft,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: THEME.colors.primaryDark,
    fontWeight: '700',
  },
  listContent: {
    padding: THEME.spacing.base,
    paddingBottom: THEME.spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
});
