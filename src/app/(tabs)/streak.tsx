import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useFitness } from '@/context/FitnessContext';
import { useTheme } from '@/hooks/use-theme';
import { IOSCard } from '@/components/ui/IOSCard';
import { FitnessStorage } from '@/services/storage';

export default function StreakScreen() {
  const theme = useTheme();
  const { streakStats, workoutLogs, exercises, userPrefs, resetToDemo, refreshData } = useFitness();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const json = await FitnessStorage.exportAllData();
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `liftlog-backup-${dateStr}.json`;
      const fileUri = FileSystem.cacheDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Save LiftLog Backup' });
      } else {
        Alert.alert('Exported', `Backup saved to:\n${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Could not export backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const fileUri = result.assets[0].uri;
      Alert.alert(
        'Restore Backup?',
        'This will replace ALL current data with the backup. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              setIsImporting(true);
              try {
                const json = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
                await FitnessStorage.importAllData(json);
                await refreshData();
                Alert.alert('✅ Restored', 'Your backup has been restored successfully.');
              } catch (e: any) {
                Alert.alert('Import Failed', e?.message || 'Invalid or corrupted backup file.');
              } finally {
                setIsImporting(false);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Import Failed', e?.message || 'Could not read the file.');
    }
  };

  // Active month navigation state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [inspectedDayStr, setInspectedDayStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Set of dates that have workouts
  const workoutDateSet = useMemo(() => {
    return new Set(streakStats.workoutDates);
  }, [streakStats.workoutDates]);

  // Calendar month data generation
  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 for Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding for days before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: 0, dateStr: '', isCurrentMonth: false });
    }
    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: true });
    }
    return days;
  }, [selectedDate]);

  const monthTitle = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedDate]);

  const changeMonth = (delta: number) => {
    const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + delta, 1);
    setSelectedDate(next);
  };

  // Workouts logged on inspected date
  const inspectedWorkouts = useMemo(() => {
    return workoutLogs.filter((l) => l.date === inspectedDayStr);
  }, [workoutLogs, inspectedDayStr]);

  const exerciseMap = useMemo(() => {
    const map = new Map();
    exercises.forEach((ex) => map.set(ex.id, ex.name));
    return map;
  }, [exercises]);

  const handleResetDemo = () => {
    Alert.alert(
      'Reset Demo Data',
      'This will reload default exercises, sample workout logs, and body weight history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetToDemo() },
      ]
    );
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#FFFFFF' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            CONSISTENCY & HABITS
          </Text>
          <Text style={[styles.largeTitle, { color: theme.text }]}>Streaks</Text>
        </View>

        <View style={[styles.flameIconWrapper, { backgroundColor: 'rgba(255, 69, 58, 0.15)' }]}>
          <Ionicons name="flame" size={24} color="#FF453A" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Streak Card */}
        <IOSCard style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>
                CURRENT STREAK
              </Text>
              <View style={styles.streakCountRow}>
                <Text style={[styles.heroStreakNumber, { color: theme.text }]}>
                  {streakStats.currentStreak}
                </Text>
                <Text style={[styles.heroStreakDays, { color: theme.textSecondary }]}>
                  {streakStats.currentStreak === 1 ? 'DAY' : 'DAYS'}
                </Text>
                <Ionicons
                  name="flame"
                  size={28}
                  color={streakStats.currentStreak > 0 ? '#FF453A' : theme.textTertiary}
                  style={{ marginLeft: 6 }}
                />
              </View>
            </View>

            <View style={styles.longestStreakBadge}>
              <Text style={[styles.longestLabel, { color: theme.textSecondary }]}>
                LONGEST
              </Text>
              <Text style={[styles.longestValue, { color: '#FF9F0A' }]}>
                {streakStats.longestStreak} days
              </Text>
            </View>
          </View>

          {/* Activity quick stats bar */}
          <View style={[styles.quickStatsRow, { borderTopColor: theme.border }]}>
            <View style={styles.quickStatItem}>
              <Text style={[styles.quickStatVal, { color: theme.text }]}>
                {streakStats.thisWeekCount}
              </Text>
              <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>
                This Week
              </Text>
            </View>
            <View style={styles.quickDivider} />
            <View style={styles.quickStatItem}>
              <Text style={[styles.quickStatVal, { color: theme.text }]}>
                {streakStats.thisMonthCount}
              </Text>
              <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>
                This Month
              </Text>
            </View>
            <View style={styles.quickDivider} />
            <View style={styles.quickStatItem}>
              <Text style={[styles.quickStatVal, { color: theme.text }]}>
                {streakStats.totalWorkoutDays}
              </Text>
              <Text style={[styles.quickStatLabel, { color: theme.textSecondary }]}>
                Total Days
              </Text>
            </View>
          </View>
        </IOSCard>

        {/* Calendar Visualization Card */}
        <IOSCard style={styles.calendarCard}>
          {/* Calendar Header with Month Nav */}
          <View style={styles.calHeader}>
            <Text style={[styles.calMonthTitle, { color: theme.text }]}>
              {monthTitle}
            </Text>
            <View style={styles.calNavBtns}>
              <TouchableOpacity
                onPress={() => changeMonth(-1)}
                style={[styles.calArrow, { backgroundColor: theme.inputBackground }]}
              >
                <Ionicons name="chevron-back" size={16} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => changeMonth(1)}
                style={[styles.calArrow, { backgroundColor: theme.inputBackground }]}
              >
                <Ionicons name="chevron-forward" size={16} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Days of week header */}
          <View style={styles.weekDaysRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <Text key={i} style={[styles.weekDayHeader, { color: theme.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calGrid}>
            {calendarDays.map((item, index) => {
              if (!item.isCurrentMonth) {
                return <View key={index} style={styles.calDayCell} />;
              }

              const hasWorkout = workoutDateSet.has(item.dateStr);
              const isToday = item.dateStr === todayStr;
              const isInspected = item.dateStr === inspectedDayStr;

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  onPress={() => setInspectedDayStr(item.dateStr)}
                  style={[
                    styles.calDayCell,
                    isInspected && {
                      borderColor: theme.tint,
                      borderWidth: 1.5,
                      borderRadius: 12,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.calDayBubble,
                      hasWorkout && { backgroundColor: '#34C759' },
                      isToday && !hasWorkout && { borderColor: theme.tint, borderWidth: 1.5 },
                    ]}
                  >
                    {hasWorkout ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.calDayText,
                          { color: hasWorkout ? '#FFFFFF' : theme.text },
                          isToday && { color: theme.tint, fontWeight: '700' },
                        ]}
                      >
                        {item.dayNumber}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.calLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                Workout Completed
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { borderColor: theme.tint, borderWidth: 1.5, backgroundColor: 'transparent' },
                ]}
              />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                Today
              </Text>
            </View>
          </View>
        </IOSCard>

        {/* Selected Day Workout Details */}
        <View style={styles.inspectedSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Workouts on {inspectedDayStr}
          </Text>

          {inspectedWorkouts.length > 0 ? (
            inspectedWorkouts.map((log) => {
              const exName = exerciseMap.get(log.exerciseId) || 'Workout';

              return (
                <IOSCard key={log.id} style={styles.workoutLogCard}>
                  <View style={styles.logCardHeader}>
                    <View>
                      <Text style={[styles.logExerciseName, { color: theme.text }]}>
                        {exName}
                      </Text>
                      {log.notes ? (
                        <Text style={[styles.logNotes, { color: theme.textSecondary }]}>
                          &ldquo;{log.notes}&rdquo;
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.setCountPill}>
                      <Text style={[styles.setCountText, { color: theme.tint }]}>
                        {log.sets.length} sets
                      </Text>
                    </View>
                  </View>

                  <View style={styles.setsSummaryRow}>
                    {log.sets.map((s, idx) => (
                      <View
                        key={s.id}
                        style={[
                          styles.setChip,
                          { backgroundColor: theme.inputBackground },
                          s.isWarmup && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[styles.setChipText, { color: theme.text }]}>
                          {s.weight}
                          <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                            {userPrefs.weightUnit}
                          </Text>
                          {' × '}{s.reps}
                        </Text>
                      </View>
                    ))}
                  </View>
                </IOSCard>
              );
            })
          ) : (
            <View
              style={[
                styles.emptyInspectedCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Ionicons name="barbell-outline" size={24} color={theme.textTertiary} />
              <Text style={[styles.emptyInspectedText, { color: theme.textSecondary }]}>
                No workouts logged for this date.
              </Text>
            </View>
          )}
        </View>

        {/* Local Storage, Backup & Reset Footer */}
        <IOSCard style={styles.settingsCard}>
          <View style={styles.storageInfoRow}>
            <Ionicons name="cloud-offline-outline" size={22} color={theme.tint} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.storageTitle, { color: theme.text }]}>
                100% Local & Offline
              </Text>
              <Text style={[styles.storageSub, { color: theme.textSecondary }]}>
                All data is stored on your device. Use backup to transfer data or keep a safe copy.
              </Text>
            </View>
          </View>

          {/* Export Backup */}
          <TouchableOpacity
            onPress={handleExportBackup}
            disabled={isExporting}
            style={[styles.actionBtn, { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14 }]}
          >
            <Ionicons name="share-outline" size={18} color={theme.tint} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.actionBtnTitle, { color: theme.text }]}>
                {isExporting ? 'Exporting...' : 'Export Backup'}
              </Text>
              <Text style={[styles.actionBtnSub, { color: theme.textSecondary }]}>
                Save a JSON file with all your data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </TouchableOpacity>

          {/* Import / Restore */}
          <TouchableOpacity
            onPress={handleImportBackup}
            disabled={isImporting}
            style={[styles.actionBtn, { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}
          >
            <Ionicons name="download-outline" size={18} color='#30D158' />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.actionBtnTitle, { color: theme.text }]}>
                {isImporting ? 'Restoring...' : 'Import Backup'}
              </Text>
              <Text style={[styles.actionBtnSub, { color: theme.textSecondary }]}>
                Restore data from a backup file
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
          </TouchableOpacity>

          {/* Reset Demo */}
          <TouchableOpacity
            onPress={handleResetDemo}
            style={[styles.resetBtn, { borderTopColor: theme.border }]}
          >
            <Ionicons name="refresh-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.resetText, { color: theme.textSecondary }]}>
              Reset Sample Demo Data
            </Text>
          </TouchableOpacity>
        </IOSCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
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
  flameIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  heroCard: {
    padding: 18,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStreakNumber: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroStreakDays: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 6,
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  longestStreakBadge: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  longestLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  longestValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatVal: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  quickDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(142, 142, 147, 0.25)',
  },
  calendarCard: {
    padding: 16,
    marginBottom: 20,
  },
  calHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calMonthTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  calNavBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  calArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayHeader: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calDayCell: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  calDayBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  calLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(142, 142, 147, 0.2)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
  inspectedSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  workoutLogCard: {
    padding: 14,
    marginBottom: 10,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logExerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  logNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  setCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  setCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  setChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  setChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyInspectedCard: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyInspectedText: {
    fontSize: 13,
  },
  settingsCard: {
    padding: 16,
  },
  storageInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  storageSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionBtnTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionBtnSub: {
    fontSize: 12,
    marginTop: 1,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
