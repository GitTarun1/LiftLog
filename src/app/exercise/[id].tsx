import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFitness } from '@/context/FitnessContext';
import { useTheme } from '@/hooks/use-theme';
import { FitnessStorage } from '@/services/storage';
import { IOSCard } from '@/components/ui/IOSCard';
import { ChartDataPoint, IOSChart, TimeRange } from '@/components/ui/IOSChart';
import { IOSSegmentedControl } from '@/components/ui/IOSSegmentedControl';
import { LogWorkoutModal } from '@/components/LogWorkoutModal';
import { WorkoutLog } from '@/types/fitness';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const {
    exercises,
    workoutLogs,
    userPrefs,
    addWorkoutLog,
    deleteWorkoutLog,
    deleteExercise,
  } = useFitness();

  const [activeTab, setActiveTab] = useState<'history' | 'progress'>('history');
  const [timeframe, setTimeframe] = useState<TimeRange>('3M');
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);

  // Find the exercise
  const exercise = exercises.find((e) => e.id === id);

  // Logs for this exercise (sorted desc by timestamp for history)
  const exerciseLogs = useMemo(() => {
    return workoutLogs
      .filter((l) => l.exerciseId === id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [workoutLogs, id]);

  // Overall Exercise Stats
  const stats = useMemo(() => {
    return FitnessStorage.calculateExerciseStats(id || '', workoutLogs);
  }, [id, workoutLogs]);

  // Build progression graph data
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (exerciseLogs.length === 0) return [];

    // Ascending order for chart
    const ascLogs = [...exerciseLogs].sort((a, b) => a.timestamp - b.timestamp);

    const latestTimestamp = ascLogs[ascLogs.length - 1].timestamp;
    const dayMs = 86400000;
    let cutoff = 0;
    if (timeframe === '10D') cutoff = latestTimestamp - 10 * dayMs;
    else if (timeframe === '1M') cutoff = latestTimestamp - 30 * dayMs;
    else if (timeframe === '3M') cutoff = latestTimestamp - 90 * dayMs;
    else if (timeframe === '6M') cutoff = latestTimestamp - 180 * dayMs;
    else if (timeframe === '1Y') cutoff = latestTimestamp - 365 * dayMs;
    else cutoff = 0; // ALL

    let filtered = ascLogs.filter((l) => l.timestamp >= cutoff);
    if (filtered.length === 0) {
      const fallbackCount = timeframe === '10D' ? 5 : timeframe === '1M' ? 8 : ascLogs.length;
      filtered = ascLogs.slice(-fallbackCount);
    }

    if (timeframe === '10D' || timeframe === '1M' || timeframe === '3M' || filtered.length <= 12) {
      // Pick top set weight for each workout session
      return filtered.map((log) => {
        const topWeight = Math.max(...log.sets.map((s) => s.weight), 0);
        const d = new Date(log.timestamp);
        const monthShort = d.toLocaleString('en-US', { month: 'short' });
        const day = d.getDate();
        return {
          label: `${monthShort} ${day}`,
          value: topWeight,
          dateStr: log.date,
          subtext: `${log.sets.length} sets`,
        };
      });
    } else {
      // Monthly max weight
      const monthMap = new Map<string, { maxWeight: number; dateStr: string }>();
      filtered.forEach((log) => {
        const d = new Date(log.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const topWeight = Math.max(...log.sets.map((s) => s.weight), 0);
        const existing = monthMap.get(key) || { maxWeight: 0, dateStr: log.date };
        if (topWeight > existing.maxWeight) {
          existing.maxWeight = topWeight;
        }
        monthMap.set(key, existing);
      });

      const result: ChartDataPoint[] = [];
      monthMap.forEach((val, key) => {
        const [year, month] = key.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = dateObj.toLocaleString('en-US', { month: 'short' });
        result.push({
          label: monthName,
          value: val.maxWeight,
          dateStr: val.dateStr,
        });
      });
      return result;
    }
  }, [exerciseLogs, timeframe]);

  if (!exercise) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFoundContainer}>
          <Text style={[styles.notFoundText, { color: theme.textSecondary }]}>
            Exercise not found.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={{ color: theme.tint }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleDeleteExercise = () => {
    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to delete "${exercise.name}" and all its history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteExercise(exercise.id);
            router.back();
          },
        },
      ]
    );
  };

  const confirmDeleteLog = (log: WorkoutLog) => {
    Alert.alert(
      'Delete Workout Log',
      `Delete workout entry from ${log.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteWorkoutLog(log.id),
        },
      ]
    );
  };

  const lastLoggedSet =
    exerciseLogs.length > 0 && exerciseLogs[0].sets.length > 0
      ? {
          weight: exerciseLogs[0].sets[0].weight,
          reps: exerciseLogs[0].sets[0].reps,
        }
      : undefined;

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

  const catStyle = CATEGORY_STYLES[exercise.category] || CATEGORY_STYLES.other;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#FFFFFF' ? 'light-content' : 'dark-content'} />

      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navBackBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={theme.tint} />
          <Text style={[styles.navBackText, { color: theme.tint }]}>Exercises</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteExercise}
          style={styles.navActionBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'history' ? exerciseLogs : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Title & Tag Section */}
            <View style={styles.titleSection}>
              <View style={[styles.categoryBadge, { backgroundColor: catStyle.bg }]}>
                <Text style={[styles.categoryBadgeText, { color: catStyle.text }]}>
                  {exercise.category.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.exerciseName, { color: theme.text }]}>
                {exercise.name}
              </Text>
              {exercise.notes ? (
                <Text style={[styles.notesText, { color: theme.textSecondary }]}>
                  &ldquo;{exercise.notes}&rdquo;
                </Text>
              ) : null}
            </View>

            {/* Quick PR Highlights Row */}
            <View style={styles.statsGrid}>
              <IOSCard style={styles.statCard}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  MAX WEIGHT
                </Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {stats.maxWeight > 0 ? `${stats.maxWeight} ${userPrefs.weightUnit}` : '--'}
                </Text>
                <Text style={[styles.statSub, { color: theme.tint }]}>Personal Record</Text>
              </IOSCard>

              <IOSCard style={styles.statCard}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  EST. 1RM
                </Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {stats.estimated1RM > 0 ? `${stats.estimated1RM} ${userPrefs.weightUnit}` : '--'}
                </Text>
                <Text style={[styles.statSub, { color: theme.textSecondary }]}>One Rep Max</Text>
              </IOSCard>

              <IOSCard style={styles.statCard}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                  WORKOUTS
                </Text>
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {stats.totalWorkouts}
                </Text>
                <Text style={[styles.statSub, { color: theme.textSecondary }]}>Total Sessions</Text>
              </IOSCard>
            </View>

            {/* Quick Action: Log Workout / Sets */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsLogModalVisible(true)}
              style={[styles.logWorkoutBtn, { backgroundColor: theme.tint }]}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.logWorkoutBtnText}>Log Workout / Sets</Text>
            </TouchableOpacity>

            {/* View Switcher: History vs Progress Graph */}
            <View style={styles.segmentedWrapper}>
              <IOSSegmentedControl
                options={[
                  { label: 'Workout History', value: 'history' },
                  { label: 'Progress Graph', value: 'progress' },
                ]}
                selectedValue={activeTab}
                onValueChange={setActiveTab}
              />
            </View>

            {/* Progress Graph View */}
            {activeTab === 'progress' && (
              <IOSCard style={styles.chartCard}>
                <Text style={[styles.chartSectionTitle, { color: theme.text }]}>
                  Weight Progression
                </Text>
                <IOSChart
                  data={chartData}
                  unit={userPrefs.weightUnit}
                  timeframe={timeframe}
                  onTimeframeChange={setTimeframe}
                  accentColor={theme.tint}
                  emptyMessage="No workout history yet. Log a workout session to see your progress curve!"
                />
              </IOSCard>
            )}

            {/* History Section Title */}
            {activeTab === 'history' && (
              <View style={styles.historyHeaderRow}>
                <Text style={[styles.historyHeaderTitle, { color: theme.text }]}>
                  Logged Sessions
                </Text>
                <Text style={[styles.historyHeaderCount, { color: theme.textSecondary }]}>
                  {exerciseLogs.length} sessions
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          if (activeTab !== 'history') return null;

          const sessionVolume = item.sets.reduce((acc, s) => acc + s.weight * s.reps, 0);

          return (
            <IOSCard style={styles.workoutSessionCard}>
              <View style={styles.sessionCardHeader}>
                <View>
                  <Text style={[styles.sessionDate, { color: theme.text }]}>
                    {item.date}
                  </Text>
                  <Text style={[styles.sessionVolume, { color: theme.textSecondary }]}>
                    Volume: {sessionVolume.toLocaleString()} {userPrefs.weightUnit}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => confirmDeleteLog(item)}
                  style={styles.deleteLogBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Sets Table */}
              <View style={styles.setsTable}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.colIndex, { color: theme.textSecondary }]}>SET</Text>
                  <Text style={[styles.colWeight, { color: theme.textSecondary }]}>
                    WEIGHT ({userPrefs.weightUnit})
                  </Text>
                  <Text style={[styles.colReps, { color: theme.textSecondary }]}>REPS</Text>
                  <Text style={[styles.colNote, { color: theme.textSecondary }]}>TYPE</Text>
                </View>

                {item.sets.map((set, sIdx) => (
                  <View
                    key={set.id || sIdx}
                    style={[
                      styles.tableRow,
                      {
                        borderTopColor: theme.border,
                        borderTopWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={styles.colIndex}>
                      <View
                        style={[
                          styles.setMiniBadge,
                          {
                            backgroundColor: set.isWarmup
                              ? '#FF9F0A'
                              : theme.inputBackground,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.setMiniBadgeText,
                            { color: set.isWarmup ? '#FFFFFF' : theme.text },
                          ]}
                        >
                          {set.setNumber}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.colWeight, styles.tableCellText, { color: theme.text }]}>
                      {set.weight}
                    </Text>
                    <Text style={[styles.colReps, styles.tableCellText, { color: theme.text }]}>
                      {set.reps}
                    </Text>
                    <View style={styles.colNote}>
                      {set.isWarmup ? (
                        <Text style={styles.warmupBadgeText}>Warmup</Text>
                      ) : (
                        <Text style={[styles.workBadgeText, { color: theme.textSecondary }]}>
                          Work
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {item.notes ? (
                <View style={[styles.sessionNotesBox, { backgroundColor: theme.inputBackground }]}>
                  <Text style={[styles.sessionNotesText, { color: theme.textSecondary }]}>
                    &ldquo;{item.notes}&rdquo;
                  </Text>
                </View>
              ) : null}
            </IOSCard>
          );
        }}
        ListEmptyComponent={
          activeTab === 'history' ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={40} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No workouts logged yet. Tap &ldquo;Log Workout / Sets&rdquo; above!
              </Text>
            </View>
          ) : null
        }
      />

      <LogWorkoutModal
        visible={isLogModalVisible}
        exercise={exercise}
        unit={userPrefs.weightUnit}
        lastLoggedSet={lastLoggedSet}
        onClose={() => setIsLogModalVisible(false)}
        onSave={async (sets, notes, date) => {
          await addWorkoutLog({
            exerciseId: exercise.id,
            date: date || new Date().toISOString().split('T')[0],
            sets,
            notes,
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
  },
  backBtn: {
    padding: 8,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  navBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -4,
  },
  navBackText: {
    fontSize: 17,
  },
  navActionBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  titleSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exerciseName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  notesText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statSub: {
    fontSize: 10,
  },
  logWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  logWorkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  segmentedWrapper: {
    marginBottom: 16,
  },
  chartCard: {
    padding: 16,
    marginBottom: 16,
  },
  chartSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  historyHeaderCount: {
    fontSize: 13,
  },
  workoutSessionCard: {
    padding: 16,
    marginBottom: 12,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '700',
  },
  sessionVolume: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteLogBtn: {
    padding: 4,
  },
  setsTable: {
    width: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tableHeader: {
    paddingVertical: 4,
    marginBottom: 4,
  },
  colIndex: {
    width: 44,
  },
  setMiniBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setMiniBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  colWeight: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  colReps: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  colNote: {
    width: 60,
    alignItems: 'flex-end',
  },
  tableCellText: {
    fontSize: 15,
  },
  warmupBadgeText: {
    color: '#FF9F0A',
    fontSize: 11,
    fontWeight: '600',
  },
  workBadgeText: {
    fontSize: 11,
  },
  sessionNotesBox: {
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  sessionNotesText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
