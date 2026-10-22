import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { THEME, APP_CONFIG } from '../../constants/theme';
import { patientService } from '../../services/api';
import { DoctorCard } from '../../components/ui/DoctorCard';
import { Button } from '../../components/ui/Button';

export default function DoctorDiscoveryScreen() {
  const params = useLocalSearchParams<{ initialSpecialty?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    params.initialSpecialty || 'All'
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [onlineOnly, setOnlineOnly] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Specialties
  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => patientService.getSpecialties(),
  });

  // Doctor search query
  const { data: doctors = [], isLoading, refetch } = useQuery({
    queryKey: [
      'doctors-search',
      searchQuery,
      selectedSpecialty,
      selectedDistrict,
      selectedLanguage,
      onlineOnly,
    ],
    queryFn: () =>
      patientService.searchDoctors({
        query: searchQuery,
        specialty: selectedSpecialty === 'All' ? undefined : selectedSpecialty,
        district: selectedDistrict === 'All' ? undefined : selectedDistrict,
        language: selectedLanguage === 'All' ? undefined : selectedLanguage,
        availableNow: onlineOnly ? true : undefined,
      }),
  });

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('All');
    setSelectedDistrict('All');
    setSelectedLanguage('All');
    setOnlineOnly(false);
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedSpecialty !== 'All' ||
    selectedDistrict !== 'All' ||
    selectedLanguage !== 'All' ||
    onlineOnly;

  return (
    <View style={styles.container}>
      {/* Search Bar & Filter Toggle */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={THEME.colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by doctor name, symptom or condition..."
            placeholderTextColor={THEME.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={THEME.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={showFilters ? THEME.colors.primary : THEME.colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
            Filters {hasActiveFilters ? '•' : ''}
          </Text>
        </Pressable>
      </View>

      {/* Specialty Filter Pill Carousel */}
      <View style={styles.pillRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            style={[styles.pill, selectedSpecialty === 'All' && styles.pillActive]}
            onPress={() => setSelectedSpecialty('All')}
          >
            <Text style={[styles.pillText, selectedSpecialty === 'All' && styles.pillTextActive]}>
              All Specialties
            </Text>
          </Pressable>
          {specialties.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.pill, selectedSpecialty === s.name && styles.pillActive]}
              onPress={() => setSelectedSpecialty(s.name)}
            >
              <Text style={[styles.pillText, selectedSpecialty === s.name && styles.pillTextActive]}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Expanded Multi-factor Filter Sheet */}
      {showFilters && (
        <View style={styles.filterSheet}>
          <View style={styles.filterSheetHeader}>
            <Text style={styles.filterSheetTitle}>Refine Specialists</Text>
            <Pressable onPress={resetFilters}>
              <Text style={styles.resetText}>Reset All</Text>
            </Pressable>
          </View>

          {/* Kigali District */}
          <Text style={styles.filterLabel}>Kigali Coverage District</Text>
          <View style={styles.optionsRow}>
            {['All', ...APP_CONFIG.coverageDistricts].map((d) => (
              <Pressable
                key={d}
                style={[styles.optionChip, selectedDistrict === d && styles.optionChipActive]}
                onPress={() => setSelectedDistrict(d)}
              >
                <Text
                  style={[styles.optionText, selectedDistrict === d && styles.optionTextActive]}
                >
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Languages */}
          <Text style={styles.filterLabel}>Consultation Language</Text>
          <View style={styles.optionsRow}>
            {['All', 'Kinyarwanda', 'English', 'French'].map((lang) => (
              <Pressable
                key={lang}
                style={[styles.optionChip, selectedLanguage === lang && styles.optionChipActive]}
                onPress={() => setSelectedLanguage(lang)}
              >
                <Text
                  style={[styles.optionText, selectedLanguage === lang && styles.optionTextActive]}
                >
                  {lang}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Online Toggle */}
          <Pressable
            style={styles.switchRow}
            onPress={() => setOnlineOnly(!onlineOnly)}
          >
            <View style={[styles.checkbox, onlineOnly && styles.checkboxActive]}>
              {onlineOnly && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <Text style={styles.switchLabel}>Show only specialists available right now</Text>
          </Pressable>
        </View>
      )}

      {/* Doctor Result List */}
      <FlatList
        data={doctors}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <DoctorCard
            doctor={item}
            onPress={() => router.push(`/(patient)/doctor/${item.userId}` as any)}
            onBookPress={() => router.push(`/(patient)/book/${item.userId}` as any)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="medkit-outline" size={38} color={THEME.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No matching doctors found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your specialty or district filter to discover available physicians in Kigali.
            </Text>
            <Button
              title="Clear Filters"
              variant="outline"
              size="sm"
              onPress={resetFilters}
              style={{ marginTop: 12 }}
            />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.base,
    paddingTop: THEME.spacing.md,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 10,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  clearIcon: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    padding: 4,
  },
  filterToggleBtn: {
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggleBtnActive: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: THEME.colors.primary,
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  filterToggleTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  pillRow: {
    paddingVertical: 10,
    paddingLeft: THEME.spacing.base,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  pillTextActive: {
    color: '#FFF',
  },
  filterSheet: {
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.base,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterSheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  resetText: {
    fontSize: 12,
    color: THEME.colors.error,
    fontWeight: '600',
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  optionChipActive: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: THEME.colors.primary,
  },
  optionText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  optionTextActive: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  checkMark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  switchLabel: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
  },
  listContent: {
    padding: THEME.spacing.base,
    paddingBottom: THEME.spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
