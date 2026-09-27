import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFitness } from '@/context/FitnessContext';
import { useTheme } from '@/hooks/use-theme';
import { FitnessStorage } from '@/services/storage';
import { Exercise, MuscleGroup } from '@/types/fitness';
import { AddExerciseModal } from '@/components/AddExerciseModal';

const CATEGORY_FILTERS: { label: string; value: 'all' | MuscleGroup }[] = [
  { label: 'All', value: 'all' },
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'back' },
  { label: 'Legs', value: 'legs' },
  { label: 'Shoulders', value: 'shoulders' },
  { label: 'Arms', value: 'arms' },
  { label: 'Core', value: 'core' },
  { label: 'Cardio', value: 'cardio' },
];

export default function ExercisesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    exercises,
    workoutLogs,
    userPrefs,
    addExercise,
    updatePreferences,
    refreshData,
  } = useFitness();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | MuscleGroup>('all');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  // Pre-calculate stats for all exercises
  const exerciseStatsMap = useMemo(() => {
    const map = new Map();
    exercises.forEach((ex) => {
      map.set(ex.id, FitnessStorage.calculateExerciseStats(ex.id, workoutLogs));
    });
    return map;
  }, [exercises, workoutLogs]);

  // Filter exercises by category and search
  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesCategory =
        selectedCategory === 'all' || ex.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [exercises, selectedCategory, searchQuery]);

  const toggleUnit = () => {
    const nextUnit = userPrefs.weightUnit === 'kg' ? 'lbs' : 'kg';
    updatePreferences({ weightUnit: nextUnit });
  };

  const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
    chest: { bg: 'rgba(10, 132, 255, 0.12)', text: '#0A84FF' },
    back: { bg: 'rgba(94, 92, 230, 0.14)', text: '#5E5CE6' },
    legs: { bg: 'rgba(48, 209, 88, 0.14)', text: '#30D158' },
    shoulders: { bg: 'rgba(255, 159, 10, 0.14)', text: '#FF9F0A' },
    arms: { bg: 'rgba(191, 90, 242, 0.14)', text: '#BF5AF2' },
    core: { bg: 'rgba(255, 55, 95, 0.14)', text: '#FF375F' },
    full_body: { bg: 'rgba(255, 69, 58, 0.14)', text: '#FF453A' },
    cardio: { bg: 'rgba(100, 210, 255, 0.14)', text: '#64D2FF' },
    other: { bg: 'rgba(142, 142, 147, 0.12)', text: '#8E8E93' },
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const stats = exerciseStatsMap.get(item.id);
    const hasLogs = stats && stats.totalWorkouts > 0;
    const catStyle = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.other;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(`/exercise/${item.id}` as any)}
        style={[
          styles.exerciseCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.cardLeft}>
          <View style={styles.titleRow}>
            <Text style={[styles.exerciseTitle, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
              <Text style={[styles.categoryBadgeText, { color: catStyle.text }]}>
                {item.category.replace('_', ' ').toUpperCase()}
              </Text>
            </View>

            {hasLogs ? (
              <Text style={[styles.lastLoggedText, { color: theme.textSecondary }]}>
                {stats.lastWeight} {userPrefs.weightUnit} × {stats.lastReps} reps
              </Text>
            ) : (
              <Text style={[styles.noLogsText, { color: theme.textTertiary }]}>
                Tap to log first workout
              </Text>
            )}
          </View>
        </View>

        <View style={styles.cardRight}>
          {hasLogs && stats.maxWeight > 0 ? (
            <View style={[styles.prBadgeWrapper, { backgroundColor: 'rgba(255, 159, 10, 0.1)' }]}>
              <Ionicons name="trophy" size={11} color="#FF9F0A" style={{ marginRight: 3 }} />
              <Text style={[styles.prValue, { color: '#FF9F0A' }]}>
                {stats.maxWeight} {userPrefs.weightUnit}
              </Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#FFFFFF' ? 'light-content' : 'dark-content'} />

      {/* iOS Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
              LIFTLOG TRACKER
            </Text>
            <Text style={[styles.largeTitle, { color: theme.text }]}>Exercises</Text>
          </View>

          <View style={styles.headerActions}>
            {/* Unit toggle pill (kg / lbs) */}
            <TouchableOpacity
              onPress={toggleUnit}
              style={[styles.unitToggle, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
            >
              <Text style={[styles.unitToggleText, { color: theme.text }]}>
                {userPrefs.weightUnit.toUpperCase()}
              </Text>
            </TouchableOpacity>

            {/* Add Exercise Button */}
            <TouchableOpacity
              onPress={() => setIsAddModalVisible(true)}
              style={[styles.addBtn, { backgroundColor: theme.tint }]}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="search" size={17} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search exercises..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter Chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORY_FILTERS}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.value;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item.value)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? theme.text : theme.inputBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? theme.background : theme.textSecondary,
                      fontWeight: isSelected ? '600' : '400',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Exercise List */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        renderItem={renderExerciseItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No exercises found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {searchQuery
                ? 'Try a different search term.'
                : 'Tap "+" to create your first exercise.'}
            </Text>
          </View>
        }
      />

      {/* Add Exercise Modal */}
      <AddExerciseModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onAdd={addExercise}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 10,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unitToggle: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  unitToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 40,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterList: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    marginBottom: 6,
  },
  exerciseTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  lastLoggedText: {
    fontSize: 13,
  },
  noLogsText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  prValue: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});
