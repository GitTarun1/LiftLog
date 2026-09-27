import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFitness } from '@/context/FitnessContext';
import { useTheme } from '@/hooks/use-theme';
import { IOSCard } from '@/components/ui/IOSCard';
import { ChartDataPoint, IOSChart } from '@/components/ui/IOSChart';
import { LogBodyWeightModal } from '@/components/LogBodyWeightModal';
import { BodyWeightEntry } from '@/types/fitness';

export default function BodyWeightScreen() {
  const theme = useTheme();
  const { bodyWeightEntries, userPrefs, addBodyWeight, deleteBodyWeight } = useFitness();
  const [timeframe, setTimeframe] = useState<'weeks' | 'months'>('weeks');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Sort entries chronologically (oldest to newest for charting)
  const sortedAsc = useMemo(() => {
    return [...bodyWeightEntries].sort((a, b) => a.timestamp - b.timestamp);
  }, [bodyWeightEntries]);

  // Aggregate points based on timeframe: 'weeks' vs 'months'
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (sortedAsc.length === 0) return [];

    if (timeframe === 'weeks') {
      // Group by week or show the last 10 entries spaced out
      const recent = sortedAsc.slice(-12);
      return recent.map((item, idx) => {
        const d = new Date(item.timestamp);
        const day = d.getDate();
        const monthShort = d.toLocaleString('en-US', { month: 'short' });
        return {
          label: `${monthShort} ${day}`,
          value: item.weight,
          dateStr: item.date,
          subtext: item.note,
        };
      });
    } else {
      // Group by Month (average weight per month)
      const monthMap = new Map<string, { sum: number; count: number; dateStr: string }>();
      sortedAsc.forEach((entry) => {
        const d = new Date(entry.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthMap.get(key) || { sum: 0, count: 0, dateStr: entry.date };
        existing.sum += entry.weight;
        existing.count += 1;
        monthMap.set(key, existing);
      });

      const result: ChartDataPoint[] = [];
      monthMap.forEach((val, key) => {
        const [year, month] = key.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = dateObj.toLocaleString('en-US', { month: 'short' });
        result.push({
          label: monthName,
          value: parseFloat((val.sum / val.count).toFixed(1)),
          dateStr: val.dateStr,
        });
      });
      return result.slice(-8);
    }
  }, [sortedAsc, timeframe]);

  // Summary Metrics
  const currentWeight = sortedAsc.length > 0 ? sortedAsc[sortedAsc.length - 1].weight : null;
  const initialWeight = sortedAsc.length > 0 ? sortedAsc[0].weight : null;
  const totalChange = currentWeight !== null && initialWeight !== null ? currentWeight - initialWeight : 0;

  // 7-day average
  const last7DaysAverage = useMemo(() => {
    if (sortedAsc.length === 0) return currentWeight;
    const latestTimestamp = sortedAsc[sortedAsc.length - 1].timestamp;
    const sevenDaysAgo = latestTimestamp - 7 * 86400000;
    const recent = sortedAsc.filter((e) => e.timestamp >= sevenDaysAgo);
    if (recent.length === 0) return currentWeight;
    const sum = recent.reduce((acc, curr) => acc + curr.weight, 0);
    return parseFloat((sum / recent.length).toFixed(1));
  }, [sortedAsc, currentWeight]);

  const confirmDelete = (item: BodyWeightEntry) => {
    Alert.alert(
      'Delete Weight Entry',
      `Delete entry of ${item.weight} ${userPrefs.weightUnit} on ${item.date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteBodyWeight(item.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#FFFFFF' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            BODY COMPOSITION
          </Text>
          <Text style={[styles.largeTitle, { color: theme.text }]}>Body Weight</Text>
        </View>

        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          style={[styles.logBtn, { backgroundColor: theme.tint }]}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.logBtnText}>Log Weight</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={bodyWeightEntries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Highlights Grid */}
            <View style={styles.metricsGrid}>
              <IOSCard style={styles.metricCard}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  CURRENT
                </Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {currentWeight !== null ? `${currentWeight} ${userPrefs.weightUnit}` : '--'}
                </Text>
                <Text style={[styles.metricSub, { color: theme.textSecondary }]}>
                  Latest weigh-in
                </Text>
              </IOSCard>

              <IOSCard style={styles.metricCard}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  7-DAY AVG
                </Text>
                <Text style={[styles.metricValue, { color: theme.text }]}>
                  {last7DaysAverage !== null ? `${last7DaysAverage} ${userPrefs.weightUnit}` : '--'}
                </Text>
                <Text style={[styles.metricSub, { color: theme.textSecondary }]}>
                  Moving average
                </Text>
              </IOSCard>

              <IOSCard style={styles.metricCard}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                  NET CHANGE
                </Text>
                <Text
                  style={[
                    styles.metricValue,
                    {
                      color:
                        totalChange < 0
                          ? '#34C759'
                          : totalChange > 0
                          ? theme.tintFlame
                          : theme.text,
                    },
                  ]}
                >
                  {totalChange > 0 ? `+${totalChange.toFixed(1)}` : totalChange.toFixed(1)}{' '}
                  {userPrefs.weightUnit}
                </Text>
                <Text style={[styles.metricSub, { color: theme.textSecondary }]}>
                  Overall progress
                </Text>
              </IOSCard>
            </View>

            {/* Progression Chart Card */}
            <IOSCard style={styles.chartCard}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Progression Graph
              </Text>
              <IOSChart
                data={chartData}
                unit={userPrefs.weightUnit}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                accentColor={theme.tint}
                emptyMessage="No body weight entries yet. Tap 'Log Weight' to start."
              />
            </IOSCard>

            {/* History Section Title */}
            <View style={styles.historyHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>History</Text>
              <Text style={[styles.entryCountText, { color: theme.textSecondary }]}>
                {bodyWeightEntries.length} entries
              </Text>
            </View>
          </>
        }
        renderItem={({ item, index }) => {
          const nextItem = bodyWeightEntries[index + 1];
          const diff = nextItem ? item.weight - nextItem.weight : null;

          return (
            <View
              style={[
                styles.historyItem,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.historyLeft}>
                <Text style={[styles.historyDate, { color: theme.text }]}>{item.date}</Text>
                {item.note ? (
                  <Text style={[styles.historyNote, { color: theme.textSecondary }]}>
                    {item.note}
                  </Text>
                ) : null}
              </View>

              <View style={styles.historyRight}>
                <Text style={[styles.historyWeight, { color: theme.text }]}>
                  {item.weight} {userPrefs.weightUnit}
                </Text>
                {diff !== null && (
                  <Text
                    style={[
                      styles.historyDiff,
                      { color: diff < 0 ? '#34C759' : diff > 0 ? '#FF3B30' : theme.textSecondary },
                    ]}
                  >
                    {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                  </Text>
                )}
                <TouchableOpacity
                  onPress={() => confirmDelete(item)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="scale-outline" size={40} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No weight logs recorded yet.
            </Text>
          </View>
        }
      />

      <LogBodyWeightModal
        visible={isModalVisible}
        unit={userPrefs.weightUnit}
        lastWeight={currentWeight || 75.0}
        onClose={() => setIsModalVisible(false)}
        onSave={async (w, d, n) => {
          await addBodyWeight(w, d, n);
        }}
      />
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
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  logBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 12,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
  },
  chartCard: {
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  entryCountText: {
    fontSize: 13,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600',
  },
  historyNote: {
    fontSize: 12,
    marginTop: 2,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyDiff: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
});
