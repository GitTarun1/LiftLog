import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useFitness } from '@/context/FitnessContext';
import { useTheme } from '@/hooks/use-theme';
import { IOSCard } from '@/components/ui/IOSCard';
import { FitnessStorage } from '@/services/storage';

export default function StreakScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 12 : 8);

  const { streakStats, workoutLogs, exercises, userPrefs, refreshData } = useFitness();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const [inspectedDayStr, setInspectedDayStr] = useState<string>(todayStr);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const json = await FitnessStorage.exportAllData();
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `liftlog-backup-${dateStr}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Export Complete', 'Backup file downloaded successfully.');
        return;
      }

      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) {
        throw new Error('Device storage cache directory is not available.');
      }
      const fileUri = `${baseDir}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save or Share LiftLog Backup',
        });
      } else {
        Alert.alert('Export Complete', `Backup saved locally:\n${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Could not export backup data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const fileAsset = result.assets[0];
      const fileUri = fileAsset.uri;
      const fileName = fileAsset.name || 'backup file';

      Alert.alert(
        'Restore Backup?',
        `Restore data from "${fileName}"?\n\nThis will update your workout history, habits, body weight logs, and exercises.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore Now',
            style: 'destructive',
            onPress: async () => {
              setIsImporting(true);
              try {
                let json = '';
                if (Platform.OS === 'web') {
                  const response = await fetch(fileUri);
                  json = await response.text();
                } else {
                  json = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: FileSystem.EncodingType.UTF8,
                  });
                }
                await FitnessStorage.importAllData(json);
                await refreshData();
                Alert.alert('✅ Restore Complete', 'Your exercises, workout sessions, habits, and weight logs have been successfully restored.');
              } catch (e: any) {
                Alert.alert('Import Failed', e?.message || 'Invalid or corrupted backup file format.');
              } finally {
                setIsImporting(false);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Import Failed', e?.message || 'Could not read the selected file.');
    }
  };

  // Workouts logged on inspected date
  const inspectedWorkouts = useMemo(() => {
    return workoutLogs.filter((l) => l.date === inspectedDayStr);
  }, [workoutLogs, inspectedDayStr]);

  const exerciseMap = useMemo(() => {
    const map = new Map<string, string>();
    exercises.forEach((ex) => map.set(ex.id, ex.name));
    return map;
  }, [exercises]);

  // --- Volume Analysis per Date & Intensity Levels ---
  const { dateMetricsMap, maxDailyVolume } = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        volume: number; // total weight * reps
        setsCount: number;
        repsCount: number;
      }
    >();

    let maxVol = 0;

    workoutLogs.forEach((log) => {
      if (!log.date) return;
      let logVol = 0;
      let logSets = (log.sets || []).length;
      let logReps = 0;

      (log.sets || []).forEach((s) => {
        const w = s.weight ?? 0;
        const r = s.reps ?? 0;
        logVol += w * r;
        logReps += r;
      });

      const existing = map.get(log.date) || {
        count: 0,
        volume: 0,
        setsCount: 0,
        repsCount: 0,
      };

      existing.count += 1;
      existing.volume += logVol;
      existing.setsCount += logSets;
      existing.repsCount += logReps;

      map.set(log.date, existing);

      if (existing.volume > maxVol) {
        maxVol = existing.volume;
      }
    });

    return {
      dateMetricsMap: map,
      // Floor of 2,500 so light starting weights scale appropriately
      maxDailyVolume: Math.max(maxVol, 2500),
    };
  }, [workoutLogs]);

  // 24 Weeks Heatmap Grid — LeetCode style
  const WEEKS_COUNT = 24;
  // Each box: 13px wide + 3px gap = 16px per column
  const BOX_SIZE = 13;
  const BOX_GAP = 3;
  const COL_WIDTH = BOX_SIZE + BOX_GAP; // 16px
  const heatmapScrollRef = useRef<ScrollView>(null);

  const { heatmapWeeks, monthHeaders } = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sun .. 6 = Sat

    // Last column ends on upcoming Saturday
    const endSaturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - currentDayOfWeek));
    endSaturday.setHours(23, 59, 59, 999);

    // Start Sunday is (WEEKS_COUNT * 7 - 1) days prior
    const startSunday = new Date(endSaturday);
    startSunday.setDate(endSaturday.getDate() - (WEEKS_COUNT * 7 - 1));
    startSunday.setHours(0, 0, 0, 0);

    const weeks: { weekIndex: number; days: any[] }[] = [];
    const months: { weekIndex: number; label: string }[] = [];
    let lastMonthSeen = -1;

    for (let w = 0; w < WEEKS_COUNT; w++) {
      const days: any[] = [];
      for (let d = 0; d < 7; d++) {
        const curDate = new Date(startSunday);
        curDate.setDate(startSunday.getDate() + (w * 7 + d));

        const y = curDate.getFullYear();
        const mo = String(curDate.getMonth() + 1).padStart(2, '0');
        const dayNum = String(curDate.getDate()).padStart(2, '0');
        const dStr = `${y}-${mo}-${dayNum}`;

        const isFuture = curDate.getTime() > now.getTime() && dStr !== todayStr;
        const metrics = dateMetricsMap.get(dStr);
        const count = isFuture ? 0 : (metrics?.count || 0);
        const volume = isFuture ? 0 : (metrics?.volume || 0);
        const setsCount = isFuture ? 0 : (metrics?.setsCount || 0);

        // Intensity level 0-4 based on volume
        let level = 0;
        if (count > 0) {
          if (volume > 0) {
            const ratio = volume / maxDailyVolume;
            if (ratio < 0.25) level = 1;
            else if (ratio < 0.50) level = 2;
            else if (ratio < 0.80) level = 3;
            else level = 4;
          } else {
            if (setsCount <= 3) level = 1;
            else if (setsCount <= 7) level = 2;
            else if (setsCount <= 12) level = 3;
            else level = 4;
          }
        }

        // Month label: emit when this is day 1 of a new month
        if (curDate.getDate() === 1 && curDate.getMonth() !== lastMonthSeen) {
          lastMonthSeen = curDate.getMonth();
          months.push({
            weekIndex: w,
            label: curDate.toLocaleString('en-US', { month: 'short' }),
          });
        }

        days.push({ dateStr: dStr, dayOfWeek: d, count, volume, setsCount, level, isFuture, isToday: dStr === todayStr });
      }
      weeks.push({ weekIndex: w, days });
    }

    return {
      heatmapWeeks: weeks,
      monthHeaders: months,
    };
  }, [dateMetricsMap, maxDailyVolume, todayStr]);

  // Auto-scroll heatmap to the right on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      heatmapScrollRef.current?.scrollToEnd({ animated: false });
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const isDarkMode = theme.text === '#FFFFFF';

  // Volume Level Color Resolver — 5 tiers like GitHub/LeetCode
  const getBoxColor = (level: number) => {
    if (isDarkMode) {
      switch (level) {
        case 1: return 'rgba(48, 209, 88, 0.30)';  // faint green
        case 2: return 'rgba(48, 209, 88, 0.56)';  // medium green
        case 3: return '#30D158';                   // solid iOS green
        case 4: return '#1EFF6E';                   // bright neon green
        default: return '#252528';                  // empty cell — slightly lighter than card
      }
    } else {
      switch (level) {
        case 1: return 'rgba(52, 199, 89, 0.28)';
        case 2: return 'rgba(52, 199, 89, 0.58)';
        case 3: return '#34C759';
        case 4: return '#1A7F37';
        default: return '#E8E8ED';                  // empty cell — slightly darker than card
      }
    }
  };

  // Border color for empty cells to create visible grid
  const getBoxBorderColor = (level: number) => {
    if (level > 0) return 'transparent';
    return isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
  };

  const formatInspectedDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const inspectedMetrics = dateMetricsMap.get(inspectedDayStr);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomInset }]}
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

        {/* Workout Consistency & Volume Heatmap Card */}
        <IOSCard style={styles.heatmapCard}>
          <View style={styles.heatmapHeaderRow}>
            <View style={styles.heatmapTitleLeft}>
              <View style={[styles.heatmapIconBadge, { backgroundColor: 'rgba(48, 209, 88, 0.15)' }]}>
                <Ionicons name="barbell" size={17} color="#30D158" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.heatmapCardTitle, { color: theme.text }]}>
                  Activity Heatmap
                </Text>
              </View>
            </View>

            <View style={[styles.activeDaysPill, { backgroundColor: 'rgba(48, 209, 88, 0.12)' }]}>
              <Ionicons name="flash" size={12} color="#30D158" style={{ marginRight: 3 }} />
              <Text style={[styles.activeDaysPillText, { color: '#30D158' }]}>
                {streakStats.totalWorkoutDays} active
              </Text>
            </View>
          </View>

          {/* Inspected Date Quick Bar */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setInspectedDayStr(todayStr)}
            style={[styles.inspectBar, { backgroundColor: theme.inputBackground }]}
          >
            <View style={styles.inspectBarLeft}>
              <Ionicons name="calendar-outline" size={15} color={theme.tint} />
              <Text style={[styles.inspectBarDate, { color: theme.text }]}>
                {formatInspectedDate(inspectedDayStr)}
              </Text>
              {inspectedDayStr === todayStr && (
                <View style={[styles.todayTag, { backgroundColor: theme.tint }]}>
                  <Text style={styles.todayTagText}>Today</Text>
                </View>
              )}
            </View>

            <View style={styles.inspectBarRight}>
              {inspectedMetrics && inspectedMetrics.count > 0 ? (
                <View style={styles.inspectVolumeBadge}>
                  <Text style={[styles.inspectVolumeText, { color: '#30D158' }]}>
                    {inspectedMetrics.volume > 0
                      ? `${inspectedMetrics.volume.toLocaleString()} ${userPrefs.weightUnit} • ${inspectedMetrics.setsCount} sets`
                      : `${inspectedMetrics.setsCount} sets`}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.inspectBarStatus, { color: theme.textSecondary }]}>
                  Rest Day
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Heatmap Matrix with Aligned Day Labels */}
          <View style={styles.heatmapWrapper}>
            {/* Left Column — only Mon, Wed, Fri labels like GitHub */}
            <View style={styles.dayLabelsCol}>
              <View style={styles.monthHeaderSpacer} />
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dLabel, i) => (
                <View key={i} style={styles.dayLabelRow}>
                  <Text style={[styles.dayLabelText, { color: i % 2 === 1 ? theme.textSecondary : 'transparent' }]}>
                    {dLabel}
                  </Text>
                </View>
              ))}
            </View>

            {/* Horizontally scrollable weeks container */}
            <ScrollView
              ref={heatmapScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.heatmapScrollContainer}
            >
              <View>
                {/* Month labels row */}
                <View style={styles.monthLabelsRow}>
                  {monthHeaders.map((m, idx) => (
                    <Text
                      key={idx}
                      style={[
                        styles.monthLabelText,
                        {
                          left: m.weekIndex * COL_WIDTH,
                          color: theme.textSecondary,
                        },
                      ]}
                    >
                      {m.label}
                    </Text>
                  ))}
                </View>

                {/* 24 Weeks Columns of 7 Days */}
                <View style={styles.weeksGridRow}>
                  {heatmapWeeks.map((week) => (
                    <View key={week.weekIndex} style={styles.weekColumn}>
                      {week.days.map((day) => {
                        if (day.isFuture) {
                          return <View key={day.dateStr} style={[styles.dayBox, { backgroundColor: 'transparent' }]} />;
                        }

                        const isInspected = day.dateStr === inspectedDayStr;
                        const boxBg = getBoxColor(day.level);
                        const boxBorder = getBoxBorderColor(day.level);

                        return (
                          <TouchableOpacity
                            key={day.dateStr}
                            activeOpacity={0.7}
                            onPress={() => setInspectedDayStr(day.dateStr)}
                            style={[
                              styles.dayBox,
                              {
                                backgroundColor: boxBg,
                                borderColor: boxBorder,
                                borderWidth: day.level === 0 ? 1 : 0,
                              },
                              day.isToday && day.count === 0 && {
                                borderColor: '#E05368',
                                borderWidth: 1.5,
                              },
                              isInspected && {
                                borderColor: isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.5)',
                                borderWidth: 2,
                                transform: [{ scale: 1.2 }],
                                zIndex: 10,
                              },
                            ]}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Green Scale Legend */}
          <View style={[styles.heatmapLegendRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.legendStatsText, { color: theme.textSecondary }]}>
              {streakStats.totalWorkoutDays} active days in 24 weeks
            </Text>
            <View style={styles.legendScale}>
              <Text style={[styles.legendScaleText, { color: theme.textSecondary }]}>Less</Text>
              {[0, 1, 2, 3, 4].map((lvl) => (
                <View
                  key={lvl}
                  style={[
                    styles.legendBox,
                    {
                      backgroundColor: getBoxColor(lvl),
                      borderWidth: lvl === 0 ? 1 : 0,
                      borderColor: getBoxBorderColor(lvl),
                    },
                  ]}
                />
              ))}
              <Text style={[styles.legendScaleText, { color: theme.textSecondary }]}>More</Text>
            </View>
          </View>
        </IOSCard>

        {/* Selected Day Workout Details */}
        <View style={styles.inspectedSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Workouts on {formatInspectedDate(inspectedDayStr)}
          </Text>

          {inspectedWorkouts.length > 0 ? (
            inspectedWorkouts.map((log) => {
              const exName = exerciseMap.get(log.exerciseId) || 'Workout';

              return (
                <IOSCard key={log.id} style={styles.workoutLogCard}>
                  <View style={styles.logCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.logExerciseName, { color: theme.text }]}>
                        {exName}
                      </Text>
                      {log.notes ? (
                        <Text style={[styles.logNotes, { color: theme.textSecondary }]}>
                          "{log.notes}"
                        </Text>
                      ) : null}
                    </View>
                    <View style={[styles.setCountPill, { backgroundColor: 'rgba(10, 132, 255, 0.12)' }]}>
                      <Text style={[styles.setCountText, { color: theme.tint }]}>
                        {log.sets.length} sets
                      </Text>
                    </View>
                  </View>

                  <View style={styles.setsSummaryRow}>
                    {log.sets.map((s) => {
                      let chipLabel = '';
                      if (s.durationSeconds) {
                        const m = Math.floor(s.durationSeconds / 60);
                        const sec = s.durationSeconds % 60;
                        chipLabel = m > 0 ? `${m}m ${sec ? sec + 's' : ''}` : `${sec}s`;
                      } else if (s.weight !== undefined && s.weight > 0) {
                        chipLabel = `${s.weight}${userPrefs.weightUnit} × ${s.reps}`;
                      } else {
                        chipLabel = `${s.reps ?? 0} reps`;
                      }

                      return (
                        <View
                          key={s.id}
                          style={[
                            styles.setChip,
                            { backgroundColor: theme.inputBackground },
                            s.isWarmup && { opacity: 0.7 },
                          ]}
                        >
                          <Text style={[styles.setChipText, { color: theme.text }]}>
                            {chipLabel}
                          </Text>
                        </View>
                      );
                    })}
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
              <Ionicons name="barbell-outline" size={26} color={theme.textTertiary} />
              <Text style={[styles.emptyInspectedText, { color: theme.textSecondary }]}>
                Rest Day • No workouts logged on this date.
              </Text>
            </View>
          )}
        </View>

        {/* Local Storage & Backup Footer */}
        <IOSCard style={styles.settingsCard}>
          <View style={styles.storageInfoRow}>
            <Ionicons name="cloud-offline-outline" size={22} color={theme.tint} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.storageTitle, { color: theme.text }]}>
                100% Local & Offline
              </Text>
              <Text style={[styles.storageSub, { color: theme.textSecondary }]}>
                All data is stored securely on your device. Export backups anytime to keep your data safe.
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
                Save a JSON file with all your workout history & habits
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
            <Ionicons name="download-outline" size={18} color="#30D158" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.actionBtnTitle, { color: theme.text }]}>
                {isImporting ? 'Restoring...' : 'Import Backup'}
              </Text>
              <Text style={[styles.actionBtnSub, { color: theme.textSecondary }]}>
                Restore all data from a previously saved backup file
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
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

  /* Volume Heatmap Styles */
  heatmapCard: {
    padding: 16,
    marginBottom: 16,
  },
  heatmapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heatmapTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  heatmapIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heatmapCardSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  activeDaysPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 8,
  },
  activeDaysPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inspectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 14,
  },
  inspectBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inspectBarDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  todayTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginLeft: 4,
  },
  todayTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  inspectBarRight: {
    alignItems: 'flex-end',
  },
  inspectVolumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inspectVolumeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inspectBarStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  heatmapWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dayLabelsCol: {
    marginRight: 5,
    paddingTop: 1,
  },
  monthHeaderSpacer: {
    height: 22, // matches monthLabelsRow height + marginBottom
  },
  dayLabelRow: {
    height: 13,   // = BOX_SIZE
    marginBottom: 3, // = BOX_GAP
    justifyContent: 'center',
  },
  dayLabelText: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'right',
    width: 14,
    letterSpacing: -0.2,
  },
  heatmapScrollContainer: {
    paddingRight: 4,
  },
  monthLabelsRow: {
    height: 16,
    position: 'relative',
    marginBottom: 6,
  },
  monthLabelText: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    top: 0,
    letterSpacing: 0.1,
  },
  weeksGridRow: {
    flexDirection: 'row',
  },
  weekColumn: {
    flexDirection: 'column',
    marginRight: 3,
  },
  dayBox: {
    width: 13,
    height: 13,
    marginBottom: 3,
    borderRadius: 2.5,
  },
  heatmapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendStatsText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  legendScale: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendScaleText: {
    fontSize: 10,
    fontWeight: '500',
  },
  legendBox: {
    width: 11,
    height: 11,
    borderRadius: 2.5,
  },

  /* Inspected Section */
  inspectedSection: {
    marginBottom: 16,
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

  /* Settings Footer */
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
});
