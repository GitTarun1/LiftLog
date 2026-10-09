import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFitness } from '@/context/FitnessContext';
import { useTheme } from '@/hooks/use-theme';
import { IOSCard } from '@/components/ui/IOSCard';
import { FitnessStorage } from '@/services/storage';
import { Habit, HabitCategory, HabitFrequency } from '@/types/fitness';

const CATEGORY_META: Record<
  HabitCategory,
  { label: string; bg: string; color: string; defaultIcon: string }
> = {
  fitness: { label: 'Fitness', bg: 'rgba(52, 199, 89, 0.14)', color: '#30D158', defaultIcon: 'barbell-outline' },
  nutrition: { label: 'Nutrition', bg: 'rgba(10, 132, 255, 0.14)', color: '#0A84FF', defaultIcon: 'nutrition-outline' },
  wellness: { label: 'Wellness', bg: 'rgba(191, 90, 242, 0.14)', color: '#BF5AF2', defaultIcon: 'heart-outline' },
  daily: { label: 'Daily', bg: 'rgba(255, 159, 10, 0.14)', color: '#FF9F0A', defaultIcon: 'checkbox-outline' },
  other: { label: 'Other', bg: 'rgba(142, 142, 147, 0.14)', color: '#8E8E93', defaultIcon: 'ellipse-outline' },
};

export default function HabitsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 12 : 8);
  const { habits, addHabit, toggleHabit, deleteHabit } = useFitness();

  // Active date tracking
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | HabitCategory>('all');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  // Calendar month view state
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // New Habit/Task form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<HabitCategory>('fitness');
  const [newFrequency, setNewFrequency] = useState<HabitFrequency>('daily');
  const [newNotes, setNewNotes] = useState('');

  const formatDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = useMemo(() => formatDateStr(new Date()), []);
  const selectedDateStr = useMemo(() => formatDateStr(selectedDate), [selectedDate]);
  const isViewingToday = selectedDateStr === todayStr;

  const changeDay = (deltaDays: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + deltaDays);
    setSelectedDate(next);
  };

  const selectedDateDisplay = useMemo(() => {
    if (isViewingToday) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDateStr === formatDateStr(yesterday)) return 'Yesterday';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (selectedDateStr === formatDateStr(tomorrow)) return 'Tomorrow';
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, [selectedDate, selectedDateStr, isViewingToday]);

  // Filtered habits
  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      if (selectedCategoryFilter === 'all') return true;
      return h.category === selectedCategoryFilter;
    });
  }, [habits, selectedCategoryFilter]);

  // Today / Selected Day Completion Metrics
  const { completedCount, totalCount, progressPercent } = useMemo(() => {
    const total = filteredHabits.length;
    if (total === 0) return { completedCount: 0, totalCount: 0, progressPercent: 0 };
    const completed = filteredHabits.filter((h) => (h.completedDates || []).includes(selectedDateStr)).length;
    const percent = Math.round((completed / total) * 100);
    return { completedCount: completed, totalCount: total, progressPercent: percent };
  }, [filteredHabits, selectedDateStr]);

  // Set of dates with at least 1 completed habit across all habits
  const datesWithCompletions = useMemo(() => {
    const set = new Set<string>();
    habits.forEach((h) => {
      (h.completedDates || []).forEach((d) => set.add(d));
    });
    return set;
  }, [habits]);

  const handleCreateHabit = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Task Title Required', 'Please enter a name for your task or habit.');
      return;
    }

    try {
      await addHabit({
        title: newTitle.trim(),
        category: newCategory,
        frequency: newFrequency,
        notes: newNotes.trim() || undefined,
        icon: CATEGORY_META[newCategory].defaultIcon,
        color: CATEGORY_META[newCategory].color,
      });

      setNewTitle('');
      setNewNotes('');
      setNewCategory('fitness');
      setNewFrequency('daily');
      setIsAddModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not create task.');
    }
  };

  const confirmDelete = (habit: Habit) => {
    Alert.alert('Delete Task', `Remove "${habit.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteHabit(habit.id),
      },
    ]);
  };

  const openCalendar = () => {
    setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setIsCalendarVisible(true);
  };

  // Calendar month grid calculation
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun .. 6 = Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      dateObj: Date;
    }[] = [];

    // Previous month padding
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const dObj = new Date(year, month - 1, dayNum);
      days.push({
        dayNumber: dayNum,
        dateStr: formatDateStr(dObj),
        isCurrentMonth: false,
        dateObj: dObj,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dObj = new Date(year, month, i);
      days.push({
        dayNumber: i,
        dateStr: formatDateStr(dObj),
        isCurrentMonth: true,
        dateObj: dObj,
      });
    }

    // Next month padding to fill grid
    const remainingSlots = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const dObj = new Date(year, month + 1, i);
      days.push({
        dayNumber: i,
        dateStr: formatDateStr(dObj),
        isCurrentMonth: false,
        dateObj: dObj,
      });
    }

    return days;
  }, [calendarMonth]);

  const changeCalendarMonth = (delta: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const selectCalendarDate = (dObj: Date) => {
    setSelectedDate(dObj);
    setIsCalendarVisible(false);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.text === '#FFFFFF' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            DAILY ROUTINE & TO-DO
          </Text>
          <Text style={[styles.largeTitle, { color: theme.text }]}>Habits</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsAddModalVisible(true)}
          style={[styles.addBtn, { backgroundColor: theme.tint }]}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Selector Strip & Progress Summary Card */}
        <IOSCard style={styles.summaryCard}>
          <View style={styles.dateSelectorRow}>
            <TouchableOpacity
              onPress={() => changeDay(-1)}
              style={[styles.dateArrowBtn, { backgroundColor: theme.inputBackground }]}
            >
              <Ionicons name="chevron-back" size={16} color={theme.text} />
            </TouchableOpacity>

            {/* Clickable Date Pill with Calendar Icon */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openCalendar}
              style={[
                styles.datePill,
                { backgroundColor: isViewingToday ? 'rgba(10, 132, 255, 0.12)' : theme.inputBackground },
              ]}
            >
              <Ionicons
                name="calendar"
                size={15}
                color={isViewingToday ? theme.tint : theme.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.datePillText,
                  { color: isViewingToday ? theme.tint : theme.text },
                ]}
              >
                {selectedDateDisplay}
              </Text>
              <Ionicons
                name="chevron-down"
                size={13}
                color={isViewingToday ? theme.tint : theme.textTertiary}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => changeDay(1)}
              style={[styles.dateArrowBtn, { backgroundColor: theme.inputBackground }]}
            >
              <Ionicons name="chevron-forward" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Progress Bar & Ring Metric */}
          <View style={styles.progressRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressTitle, { color: theme.text }]}>
                  {progressPercent === 100 && totalCount > 0
                    ? 'All Finished! 🎉'
                    : progressPercent > 0
                    ? `${completedCount} of ${totalCount} Done`
                    : totalCount > 0
                    ? 'Ready for today?'
                    : 'No tasks scheduled'}
                </Text>
                <Text style={[styles.progressPercentText, { color: progressPercent === 100 ? '#30D158' : theme.tint }]}>
                  {progressPercent}%
                </Text>
              </View>

              {/* Progress Bar Background */}
              <View style={[styles.progressBarBg, { backgroundColor: theme.inputBackground }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: progressPercent === 100 ? '#30D158' : theme.tint,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </IOSCard>

        {/* Category Filter Pills */}
        {habits.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFiltersContainer}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedCategoryFilter('all')}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedCategoryFilter === 'all' ? theme.tint : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: selectedCategoryFilter === 'all' ? '#FFFFFF' : theme.text },
                ]}
              >
                All ({habits.length})
              </Text>
            </TouchableOpacity>

            {(['fitness', 'nutrition', 'wellness', 'daily'] as HabitCategory[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              const isSelected = selectedCategoryFilter === cat;
              const count = habits.filter((h) => h.category === cat).length;
              if (count === 0 && selectedCategoryFilter !== cat) return null;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategoryFilter(cat)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? meta.color : theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: isSelected ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {meta.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Aesthetic iOS-Style Tasks List */}
        {filteredHabits.length > 0 ? (
          <View style={styles.habitsList}>
            {filteredHabits.map((habit) => {
              const isCompleted = (habit.completedDates || []).includes(selectedDateStr);
              const streak = FitnessStorage.calculateHabitStreak(habit, selectedDateStr);
              const meta = CATEGORY_META[habit.category] || CATEGORY_META.other;

              return (
                <IOSCard
                  key={habit.id}
                  style={[
                    styles.habitCard,
                    isCompleted && { opacity: 0.75 },
                  ]}
                  onPress={() => toggleHabit(habit.id, selectedDateStr)}
                >
                  <View style={styles.habitCardRow}>
                    {/* iOS Circular Checkbox */}
                    <TouchableOpacity
                      activeOpacity={0.6}
                      onPress={() => toggleHabit(habit.id, selectedDateStr)}
                      style={[
                        styles.checkboxCircle,
                        isCompleted
                          ? { backgroundColor: '#30D158', borderColor: '#30D158' }
                          : { borderColor: theme.textTertiary, backgroundColor: 'transparent' },
                      ]}
                    >
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                      ) : null}
                    </TouchableOpacity>

                    {/* Task Title with Strike-Through on completion */}
                    <View style={styles.habitDetails}>
                      <Text
                        style={[
                          styles.habitTitle,
                          { color: theme.text },
                          isCompleted && [
                            styles.completedHabitTitle,
                            { color: theme.textSecondary },
                          ],
                        ]}
                      >
                        {habit.title}
                      </Text>
                    </View>

                    {/* Subtle Category & Streak Badges */}
                    <View style={styles.rightBadges}>
                      {streak > 1 ? (
                        <View style={styles.streakBadge}>
                          <Ionicons name="flame" size={11} color="#FF9F0A" />
                          <Text style={styles.streakBadgeText}>{streak}d</Text>
                        </View>
                      ) : null}

                      <View style={[styles.categoryDot, { backgroundColor: meta.color }]} />

                      {/* Delete Option */}
                      <TouchableOpacity
                        onPress={() => confirmDelete(habit)}
                        style={styles.deleteHabitBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </IOSCard>
              );
            })}
          </View>
        ) : (
          <IOSCard style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={44} color={theme.tint} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Tasks Yet</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Add custom routines, workouts, or daily habits to keep track of your consistency.
            </Text>
            <TouchableOpacity
              onPress={() => setIsAddModalVisible(true)}
              style={[styles.emptyActionBtn, { backgroundColor: theme.tint }]}
            >
              <Text style={styles.emptyActionText}>+ Add First Task</Text>
            </TouchableOpacity>
          </IOSCard>
        )}
      </ScrollView>

      {/* Interactive iOS Calendar Date Picker Modal */}
      <Modal
        visible={isCalendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCalendarVisible(false)}
      >
        <TouchableOpacity
          style={styles.calendarModalOverlay}
          activeOpacity={1}
          onPress={() => setIsCalendarVisible(false)}
        >
          <View
            style={[styles.calendarModalContent, { backgroundColor: theme.card, borderColor: theme.border }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Calendar Header */}
            <View style={styles.calendarHeaderRow}>
              <Text style={[styles.calendarMonthTitle, { color: theme.text }]}>
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <View style={styles.calendarNavButtons}>
                <TouchableOpacity
                  onPress={() => changeCalendarMonth(-1)}
                  style={[styles.calArrowBtn, { backgroundColor: theme.inputBackground }]}
                >
                  <Ionicons name="chevron-back" size={16} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => changeCalendarMonth(1)}
                  style={[styles.calArrowBtn, { backgroundColor: theme.inputBackground }]}
                >
                  <Ionicons name="chevron-forward" size={16} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekday Names (S M T W T F S) */}
            <View style={styles.weekdaysRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, idx) => (
                <Text key={idx} style={[styles.weekdayText, { color: theme.textSecondary }]}>
                  {w}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((d, idx) => {
                const isSelected = d.dateStr === selectedDateStr;
                const isToday = d.dateStr === todayStr;
                const hasCompletions = datesWithCompletions.has(d.dateStr);

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    onPress={() => selectCalendarDate(d.dateObj)}
                    style={[
                      styles.calendarDayCell,
                      isSelected && [styles.selectedDayCell, { backgroundColor: theme.tint }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : !d.isCurrentMonth
                            ? theme.textTertiary
                            : isToday
                            ? theme.tint
                            : theme.text,
                          fontWeight: isSelected || isToday ? '700' : '400',
                        },
                      ]}
                    >
                      {d.dayNumber}
                    </Text>

                    {/* Completion Dot */}
                    {hasCompletions ? (
                      <View
                        style={[
                          styles.completionDot,
                          { backgroundColor: isSelected ? '#FFFFFF' : '#30D158' },
                        ]}
                      />
                    ) : (
                      <View style={styles.completionDotPlaceholder} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Calendar Footer */}
            <View style={[styles.calendarFooterRow, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                onPress={() => {
                  const now = new Date();
                  setSelectedDate(now);
                  setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                  setIsCalendarVisible(false);
                }}
                style={[styles.jumpTodayBtn, { backgroundColor: theme.inputBackground }]}
              >
                <Text style={[styles.jumpTodayText, { color: theme.tint }]}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsCalendarVisible(false)}
                style={[styles.doneCalendarBtn, { backgroundColor: theme.tint }]}
              >
                <Text style={styles.doneCalendarText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Habit Modal Sheet */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <StatusBar barStyle={theme.text === '#FFFFFF' ? 'light-content' : 'dark-content'} />

          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: theme.tint }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Task / Habit</Text>
            <TouchableOpacity onPress={handleCreateHabit}>
              <Text style={[styles.modalDone, { color: theme.tint }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {/* Title Input */}
            <Text style={[styles.formLabel, { color: theme.textSecondary }]}>TASK NAME</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="e.g. Drink 3L Water, 100 Push-ups, Creatine"
              placeholderTextColor={theme.textTertiary}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />

            {/* Category Selector */}
            <Text style={[styles.formLabel, { color: theme.textSecondary, marginTop: 20 }]}>
              CATEGORY
            </Text>
            <View style={styles.categoryGrid}>
              {(['fitness', 'nutrition', 'wellness', 'daily'] as HabitCategory[]).map((cat) => {
                const meta = CATEGORY_META[cat];
                const isSelected = newCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={[
                      styles.categoryOption,
                      {
                        backgroundColor: isSelected ? meta.bg : theme.card,
                        borderColor: isSelected ? meta.color : theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={meta.defaultIcon as any}
                      size={18}
                      color={isSelected ? meta.color : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        { color: isSelected ? meta.color : theme.text },
                      ]}
                    >
                      {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Frequency Selector */}
            <Text style={[styles.formLabel, { color: theme.textSecondary, marginTop: 20 }]}>
              FREQUENCY
            </Text>
            <View style={[styles.frequencyRow, { backgroundColor: theme.inputBackground }]}>
              {(['daily', 'weekdays', 'weekends'] as HabitFrequency[]).map((freq) => {
                const isSelected = newFrequency === freq;
                return (
                  <TouchableOpacity
                    key={freq}
                    onPress={() => setNewFrequency(freq)}
                    style={[
                      styles.frequencyTab,
                      isSelected && [styles.frequencyTabActive, { backgroundColor: theme.card }],
                    ]}
                  >
                    <Text
                      style={[
                        styles.frequencyTabText,
                        { color: isSelected ? theme.text : theme.textSecondary },
                      ]}
                    >
                      {freq === 'daily' ? 'Daily' : freq === 'weekdays' ? 'Weekdays' : 'Weekends'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCreateHabit}
              style={[styles.modalSubmitBtn, { backgroundColor: theme.tint }]}
            >
              <Text style={styles.modalSubmitText}>Add Task</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    paddingBottom: 10,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 14,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dateArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
  },
  datePillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressPercentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 7,
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  categoryFiltersContainer: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  habitsList: {
    gap: 8,
    marginTop: 2,
    marginBottom: 16,
  },
  habitCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  habitCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  habitDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  habitTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  completedHabitTitle: {
    textDecorationLine: 'line-through',
  },
  rightBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 10, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9F0A',
  },
  deleteHabitBtn: {
    padding: 4,
    marginLeft: 2,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Calendar Modal Styles
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonthTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  calendarNavButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  calArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    width: 38,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDayCell: {
    width: 38,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  selectedDayCell: {
    borderRadius: 12,
  },
  calendarDayText: {
    fontSize: 14,
  },
  completionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  completionDotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
  calendarFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  jumpTodayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  jumpTodayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  doneCalendarBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
  },
  doneCalendarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Add Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  frequencyRow: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 3,
  },
  frequencyTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  frequencyTabActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1.5 },
        shadowOpacity: 0.15,
        shadowRadius: 2.5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  frequencyTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 40,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
