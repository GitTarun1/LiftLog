import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Alert,
  Dimensions,
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
import { FitnessStorage } from '@/services/storage';
import { Habit, HabitCategory, HabitFrequency } from '@/types/fitness';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORY_META: Record<
  HabitCategory,
  { label: string; bg: string; color: string; defaultIcon: keyof typeof Ionicons.glyphMap }
> = {
  fitness: { label: 'Fitness', bg: 'rgba(56, 88, 214, 0.16)', color: '#7E9FFF', defaultIcon: 'bicycle-outline' },
  nutrition: { label: 'Nutrition', bg: 'rgba(10, 132, 255, 0.16)', color: '#0A84FF', defaultIcon: 'nutrition-outline' },
  wellness: { label: 'Wellness', bg: 'rgba(191, 90, 242, 0.16)', color: '#BF5AF2', defaultIcon: 'heart-outline' },
  daily: { label: 'Daily', bg: 'rgba(255, 159, 10, 0.16)', color: '#FF9F0A', defaultIcon: 'checkbox-outline' },
  other: { label: 'Other', bg: 'rgba(142, 142, 147, 0.16)', color: '#8E8E93', defaultIcon: 'ellipse-outline' },
};

const HABIT_ICONS: { name: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { name: 'bicycle-outline', label: 'Cycle' },
  { name: 'barbell-outline', label: 'Lift' },
  { name: 'fitness-outline', label: 'Workout' },
  { name: 'flame-outline', label: 'Calorie' },
  { name: 'water-outline', label: 'Water' },
  { name: 'nutrition-outline', label: 'Nutrition' },
  { name: 'heart-outline', label: 'Cardio' },
  { name: 'bed-outline', label: 'Sleep' },
  { name: 'book-outline', label: 'Read' },
  { name: 'walk-outline', label: 'Steps' },
  { name: 'checkbox-outline', label: 'Task' },
  { name: 'medkit-outline', label: 'Vitamins' },
];

const HABIT_COLORS = [
  '#3858D6', // Royal Blue
  '#E05368', // Coral / Red Accent
  '#30D158', // iOS Green
  '#BF5AF2', // Vivid Purple
  '#FF9F0A', // Amber Orange
  '#00C0FF', // Sky Cyan
];

const CAPSULE_WIDTH = 54;
const CAPSULE_GAP = 8;
const DAYS_BEFORE = 21;
const DAYS_AFTER = 42;

export default function HabitsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 12 : 8;
  const screenWidth = Dimensions.get('window').width;

  const { habits, addHabit, toggleHabit, deleteHabit } = useFitness();

  // Active date tracking
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | HabitCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  // Month navigation in calendar picker modal
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Date strip horizontal scroll ref
  const dateStripRef = useRef<ScrollView>(null);

  // New Habit form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<HabitCategory>('fitness');
  const [newFrequency, setNewFrequency] = useState<HabitFrequency>('daily');
  const [selectedSpecificDays, setSelectedSpecificDays] = useState<number[]>([1, 2, 3, 4, 5]); // default Mon-Fri
  const [particularDate, setParticularDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newIcon, setNewIcon] = useState<keyof typeof Ionicons.glyphMap>('bicycle-outline');
  const [newColor, setNewColor] = useState<string>('#3858D6');
  const [newNotes, setNewNotes] = useState('');

  // Mini calendar state inside Add Habit modal
  const [pickerCalendarMonth, setPickerCalendarMonth] = useState<Date>(new Date());

  const formatDateStr = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = useMemo(() => formatDateStr(new Date()), []);
  const selectedDateStr = useMemo(() => formatDateStr(selectedDate), [selectedDate]);
  const isViewingToday = selectedDateStr === todayStr;

  // Set of dates with at least 1 completed habit across all habits
  const datesWithCompletions = useMemo(() => {
    const set = new Set<string>();
    habits.forEach((h) => {
      (h.completedDates || []).forEach((d) => set.add(d));
    });
    return set;
  }, [habits]);

  // Continuously scrollable date strip (21 days past + today + 42 days future)
  const dateStripList = useMemo(() => {
    const list = [];
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (let i = -DAYS_BEFORE; i <= DAYS_AFTER; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dStr = formatDateStr(d);
      list.push({
        date: d,
        dStr,
        dayName: DAY_LABELS[d.getDay()],
        dayNum: d.getDate(),
        monthShort: d.toLocaleString('en-US', { month: 'short' }),
        isSelected: dStr === selectedDateStr,
        isToday: dStr === todayStr,
        hasCompletions: datesWithCompletions.has(dStr),
        index: i + DAYS_BEFORE,
      });
    }
    return list;
  }, [selectedDateStr, todayStr, datesWithCompletions]);

  // Scroll to center any specific date when tapped or picked
  const scrollToDate = useCallback((dateStr: string, animated = true) => {
    const idx = dateStripList.findIndex((item) => item.dStr === dateStr);
    if (idx >= 0 && dateStripRef.current) {
      const x = idx * (CAPSULE_WIDTH + CAPSULE_GAP) - screenWidth / 2 + CAPSULE_WIDTH / 2 + 16;
      dateStripRef.current.scrollTo({ x: Math.max(0, x), animated });
    }
  }, [dateStripList, screenWidth]);

  // Scroll so that Today is first in the horizontal strip (previous days to its left, future days to its right)
  const scrollToTodayFirst = useCallback((animated = true) => {
    const todayIndex = DAYS_BEFORE; // Today is located at index DAYS_BEFORE
    const x = todayIndex * (CAPSULE_WIDTH + CAPSULE_GAP);
    dateStripRef.current?.scrollTo({ x: Math.max(0, x), animated });
  }, []);

  // When returning to the Habits section from any other tab, reset to Today and position Today first
  useFocusEffect(
    useCallback(() => {
      const now = new Date();
      setSelectedDate(now);
      const timer = setTimeout(() => {
        scrollToTodayFirst(false);
      }, 60);
      return () => clearTimeout(timer);
    }, [scrollToTodayFirst])
  );

  // Jump to today
  const jumpToToday = () => {
    const now = new Date();
    setSelectedDate(now);
    scrollToTodayFirst(true);
  };

  // Filter habits for the selected day based on scheduling
  const filteredHabits = useMemo(() => {
    return habits.filter((h) => {
      // 1. Category Filter
      if (selectedCategoryFilter !== 'all' && (h.category || 'fitness') !== selectedCategoryFilter) {
        return false;
      }
      // 2. Search Query
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = (h.title || '').toLowerCase().includes(query);
        const matchesNotes = (h.notes || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes) return false;
      }
      // 3. Scheduling Filter
      return FitnessStorage.isHabitScheduledForDate(h, selectedDateStr);
    });
  }, [habits, selectedCategoryFilter, searchQuery, selectedDateStr]);

  // Completion metrics for selected day
  const { completedCount, totalCount, progressPercent } = useMemo(() => {
    const total = filteredHabits.length;
    if (total === 0) return { completedCount: 0, totalCount: 0, progressPercent: 0 };
    const completed = filteredHabits.filter((h) => (h.completedDates || []).includes(selectedDateStr)).length;
    const percent = Math.round((completed / total) * 100);
    return { completedCount: completed, totalCount: total, progressPercent: percent };
  }, [filteredHabits, selectedDateStr]);

  const handleCreateHabit = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Task Title Required', 'Please enter a title for your habit or task.');
      return;
    }

    try {
      await addHabit({
        title: newTitle.trim(),
        category: newCategory,
        frequency: newFrequency,
        specificDays: newFrequency === 'specific_days' ? selectedSpecificDays : undefined,
        targetDate: newFrequency === 'particular_date' ? particularDate : undefined,
        icon: newIcon,
        color: newColor,
        notes: newNotes.trim() || undefined,
      });

      // Reset form
      setNewTitle('');
      setNewNotes('');
      setNewCategory('fitness');
      setNewFrequency('daily');
      setSelectedSpecificDays([1, 2, 3, 4, 5]);
      setParticularDate(todayStr);
      setNewIcon('bicycle-outline');
      setNewColor('#3858D6');
      setIsAddModalVisible(false);
    } catch {
      Alert.alert('Error', 'Could not create task.');
    }
  };

  const confirmDelete = (habit: Habit) => {
    Alert.alert('Delete Habit', `Remove "${habit.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteHabit(habit.id),
      },
    ]);
  };

  const toggleSpecificDay = (dayIndex: number) => {
    if (selectedSpecificDays.includes(dayIndex)) {
      if (selectedSpecificDays.length === 1) return; // keep at least 1 day
      setSelectedSpecificDays(selectedSpecificDays.filter((d) => d !== dayIndex));
    } else {
      setSelectedSpecificDays([...selectedSpecificDays, dayIndex].sort());
    }
  };

  // Mini calendar grid for "Particular Date" in Add modal
  const pickerCalendarDays = useMemo(() => {
    const year = pickerCalendarMonth.getFullYear();
    const month = pickerCalendarMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      dateObj: Date;
    }[] = [];

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

    for (let i = 1; i <= daysInMonth; i++) {
      const dObj = new Date(year, month, i);
      days.push({
        dayNumber: i,
        dateStr: formatDateStr(dObj),
        isCurrentMonth: true,
        dateObj: dObj,
      });
    }

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
  }, [pickerCalendarMonth]);

  // Full Month Calendar Modal days
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      dateObj: Date;
    }[] = [];

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

    for (let i = 1; i <= daysInMonth; i++) {
      const dObj = new Date(year, month, i);
      days.push({
        dayNumber: i,
        dateStr: formatDateStr(dObj),
        isCurrentMonth: true,
        dateObj: dObj,
      });
    }

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

  const selectCalendarDate = (dObj: Date) => {
    setSelectedDate(dObj);
    setIsCalendarVisible(false);
    scrollToDate(formatDateStr(dObj), true);
  };

  const isDarkMode = theme.text === '#FFFFFF';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Top Header Row — Matching user screenshot (Clean, no question mark) */}
      <View style={styles.topHeader}>
        {/* Left hamburger / menu icon with 3 salmon/coral horizontal bars */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={jumpToToday}
          style={styles.headerIconBtn}
        >
          <View style={styles.hamburgerContainer}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>

        {/* Title: 'Today' or selected date */}
        <TouchableOpacity activeOpacity={0.8} onPress={jumpToToday} style={styles.titleWrapper}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isViewingToday
              ? 'Today'
              : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </Text>
        </TouchableOpacity>

        {/* Action icons on right: Search, Filter, Calendar */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsSearchVisible(!isSearchVisible)}
            style={styles.actionIconBtn}
          >
            <Ionicons
              name={isSearchVisible ? 'close' : 'search'}
              size={20}
              color={isSearchVisible ? '#E05368' : theme.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsFilterVisible(!isFilterVisible)}
            style={styles.actionIconBtn}
          >
            <Ionicons
              name={isFilterVisible ? 'funnel' : 'funnel-outline'}
              size={19}
              color={isFilterVisible ? '#E05368' : theme.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
              setIsCalendarVisible(true);
            }}
            style={styles.actionIconBtn}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Optional Search Bar */}
      {isSearchVisible && (
        <View style={[styles.searchBar, { backgroundColor: theme.inputBackground }]}>
          <Ionicons name="search" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search habits..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Optional Category Filter Row */}
      {isFilterVisible && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipList}
        >
          {(['all', 'fitness', 'nutrition', 'wellness', 'daily', 'other'] as const).map((cat) => {
            const isSelected = selectedCategoryFilter === cat;
            const label = cat === 'all' ? 'All' : CATEGORY_META[cat].label;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategoryFilter(cat)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? '#E05368' : theme.inputBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? '#FFFFFF' : theme.textSecondary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Flexible Horizontally Scrollable Date Strip */}
      <View style={styles.flexibleWeekWrapper}>
        <ScrollView
          ref={dateStripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStripScrollContent}
        >
          {dateStripList.map((item) => {
            return (
              <TouchableOpacity
                key={item.dStr}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedDate(item.date);
                  scrollToDate(item.dStr, true);
                }}
                style={[
                  styles.dayCapsule,
                  item.isSelected
                    ? styles.dayCapsuleActive
                    : [styles.dayCapsuleInactive, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F0F0F3' }],
                ]}
              >
                <Text
                  style={[
                    styles.dayLabelText,
                    item.isSelected ? styles.dayLabelActiveText : { color: theme.textSecondary },
                  ]}
                >
                  {item.dayName}
                </Text>
                <Text
                  style={[
                    styles.dayNumText,
                    item.isSelected ? styles.dayNumActiveText : { color: theme.text },
                  ]}
                >
                  {item.dayNum}
                </Text>

                {/* Status indicator dot */}
                {item.hasCompletions && (
                  <View
                    style={[
                      styles.completionDot,
                      { backgroundColor: item.isSelected ? '#FFFFFF' : '#30D158' },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Habit List */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + bottomInset }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Compact Daily progress metric bar */}
        {totalCount > 0 && (
          <View style={[styles.progressCard, { backgroundColor: isDarkMode ? '#161618' : '#FFFFFF', borderColor: theme.border }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                {progressPercent === 100
                  ? 'All tasks completed! 🎉'
                  : `${completedCount} of ${totalCount} completed`}
              </Text>
              <Text style={[styles.progressPercentText, { color: progressPercent === 100 ? '#30D158' : '#E05368' }]}>
                {progressPercent}%
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: isDarkMode ? '#25262A' : '#E5E5EA' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: progressPercent === 100 ? '#30D158' : '#E05368',
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Thin Strips Habit List */}
        {filteredHabits.length > 0 ? (
          <View style={styles.thinStripsContainer}>
            {filteredHabits.map((item) => {
              const isCompleted = (item.completedDates || []).includes(selectedDateStr);
              const cardBg = isDarkMode ? '#161618' : '#FFFFFF';
              const iconColor = item.color || '#3858D6';

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.75}
                  onPress={() => toggleHabit(item.id, selectedDateStr)}
                  onLongPress={() => confirmDelete(item)}
                  style={[
                    styles.thinStrip,
                    {
                      backgroundColor: cardBg,
                      borderColor: isCompleted
                        ? 'rgba(48, 209, 88, 0.35)'
                        : theme.border,
                    },
                    isCompleted && styles.thinStripCompleted,
                  ]}
                >
                  {/* Left Compact Icon */}
                  <View
                    style={[
                      styles.compactIconBox,
                      {
                        backgroundColor: isCompleted
                          ? 'rgba(48, 209, 88, 0.12)'
                          : `${iconColor}22`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any || 'bicycle-outline'}
                      size={18}
                      color={isCompleted ? '#30D158' : iconColor}
                    />
                  </View>

                  {/* Task Name with Aesthetic Strike-off */}
                  <View style={styles.stripTitleWrapper}>
                    <Text
                      style={[
                        styles.stripTitle,
                        { color: isCompleted ? theme.textSecondary : theme.text },
                        isCompleted && styles.stripTitleStrikethrough,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </View>

                  {/* Right side circular completion button */}
                  <View
                    style={[
                      styles.checkCircle,
                      isCompleted
                        ? [styles.checkCircleActive, { backgroundColor: '#30D158' }]
                        : [
                            styles.checkCircleInactive,
                            {
                              borderColor: isDarkMode ? '#38383A' : '#D1D1D6',
                              backgroundColor: isDarkMode ? '#1E1E22' : '#F2F2F7',
                            },
                          ],
                    ]}
                  >
                    {isCompleted && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: 'rgba(224, 83, 104, 0.12)' }]}>
              <Ionicons name="checkmark-done-circle-outline" size={36} color="#E05368" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No habits scheduled</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              {searchQuery
                ? 'No habits match your search query.'
                : 'Tap "+" below to add a new habit.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Task Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          setParticularDate(selectedDateStr);
          setIsAddModalVisible(true);
        }}
        style={[styles.fabBtn, { bottom: bottomInset + 16 }]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* --- ADD HABIT MODAL --- */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropTouchable}
            activeOpacity={1}
            onPress={() => setIsAddModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
                borderColor: theme.border,
                paddingBottom: Math.max(insets.bottom + 12, 34),
              },
            ]}
          >
            {/* Grabber */}
            <View style={styles.modalGrabberWrapper}>
              <View style={[styles.modalGrabber, { backgroundColor: isDarkMode ? '#38383A' : '#D1D1D6' }]} />
            </View>

            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Text style={[styles.modalCancelText, { color: theme.tint }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Habit / Task</Text>
              <TouchableOpacity onPress={handleCreateHabit} disabled={!newTitle.trim()}>
                <Text
                  style={[
                    styles.modalSaveText,
                    { color: newTitle.trim() ? '#E05368' : theme.textSecondary },
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Title Input */}
              <Text style={[styles.formSectionLabel, { color: theme.textSecondary }]}>TITLE</Text>
              <View style={[styles.modalInputWrapper, { backgroundColor: theme.inputBackground }]}>
                <TextInput
                  placeholder="e.g. workout, drink water, read..."
                  placeholderTextColor={theme.textTertiary}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  style={[styles.modalTextInput, { color: theme.text }]}
                  autoFocus
                />
              </View>

              {/* Schedule Frequency Selector */}
              <Text style={[styles.formSectionLabel, { color: theme.textSecondary }]}>SCHEDULE FREQUENCY</Text>
              <View style={styles.freqPillsRow}>
                {[
                  { label: 'Everyday', value: 'daily' as HabitFrequency },
                  { label: 'Weekdays', value: 'weekdays' as HabitFrequency },
                  { label: 'Weekends', value: 'weekends' as HabitFrequency },
                  { label: 'Specific Days', value: 'specific_days' as HabitFrequency },
                  { label: 'Particular Day', value: 'particular_date' as HabitFrequency },
                ].map((item) => {
                  const isSelected = newFrequency === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      activeOpacity={0.7}
                      onPress={() => setNewFrequency(item.value)}
                      style={[
                        styles.freqPill,
                        {
                          backgroundColor: isSelected ? '#E05368' : theme.inputBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.freqPillText,
                          {
                            color: isSelected ? '#FFFFFF' : theme.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* If 'Specific Days', show Sun-Sat interactive toggles */}
              {newFrequency === 'specific_days' && (
                <View style={styles.specificDaysContainer}>
                  <Text style={[styles.subHintText, { color: theme.textSecondary }]}>
                    Select active days:
                  </Text>
                  <View style={styles.daysToggleRow}>
                    {DAY_LABELS.map((dayLabel, idx) => {
                      const isDaySelected = selectedSpecificDays.includes(idx);
                      return (
                        <TouchableOpacity
                          key={dayLabel}
                          activeOpacity={0.7}
                          onPress={() => toggleSpecificDay(idx)}
                          style={[
                            styles.dayToggleCircle,
                            {
                              backgroundColor: isDaySelected ? '#E05368' : theme.inputBackground,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayToggleCircleText,
                              {
                                color: isDaySelected ? '#FFFFFF' : theme.textSecondary,
                                fontWeight: isDaySelected ? '700' : '500',
                              },
                            ]}
                          >
                            {dayLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* If 'Particular Day', show interactive mini calendar popup (no typing needed!) */}
              {newFrequency === 'particular_date' && (
                <View style={[styles.particularCalendarBox, { backgroundColor: isDarkMode ? '#161618' : '#F5F5F7', borderColor: theme.border }]}>
                  {/* Calendar Month Header */}
                  <View style={styles.miniCalHeader}>
                    <TouchableOpacity
                      onPress={() =>
                        setPickerCalendarMonth(
                          (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                        )
                      }
                      style={styles.miniCalNavBtn}
                    >
                      <Ionicons name="chevron-back" size={16} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.miniCalTitle, { color: theme.text }]}>
                      {pickerCalendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setPickerCalendarMonth(
                          (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                        )
                      }
                      style={styles.miniCalNavBtn}
                    >
                      <Ionicons name="chevron-forward" size={16} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Weekday headers */}
                  <View style={styles.miniCalWeekdays}>
                    {DAY_LABELS.map((d) => (
                      <Text key={d} style={[styles.miniCalWeekdayText, { color: theme.textSecondary }]}>
                        {d.charAt(0)}
                      </Text>
                    ))}
                  </View>

                  {/* Grid */}
                  <View style={styles.miniCalGrid}>
                    {pickerCalendarDays.map((item, idx) => {
                      const isSelected = item.dateStr === particularDate;
                      const isToday = item.dateStr === todayStr;

                      return (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          onPress={() => setParticularDate(item.dateStr)}
                          style={[
                            styles.miniCalCell,
                            isSelected && { backgroundColor: '#E05368' },
                            isToday && !isSelected && { borderColor: '#E05368', borderWidth: 1 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.miniCalCellText,
                              {
                                color: isSelected
                                  ? '#FFFFFF'
                                  : item.isCurrentMonth
                                  ? theme.text
                                  : theme.textTertiary,
                                fontWeight: isSelected || isToday ? '700' : '400',
                              },
                            ]}
                          >
                            {item.dayNumber}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Selected date confirmation pill */}
                  <View style={styles.selectedDateBadge}>
                    <Ionicons name="calendar" size={14} color="#E05368" style={{ marginRight: 6 }} />
                    <Text style={[styles.selectedDateBadgeText, { color: theme.text }]}>
                      Selected: {particularDate}
                    </Text>
                  </View>
                </View>
              )}

              {/* Category Picker */}
              <Text style={[styles.formSectionLabel, { color: theme.textSecondary }]}>CATEGORY</Text>
              <View style={styles.categoryRow}>
                {(['fitness', 'nutrition', 'wellness', 'daily', 'other'] as HabitCategory[]).map((cat) => {
                  const isSelected = newCategory === cat;
                  const meta = CATEGORY_META[cat];
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setNewCategory(cat)}
                      style={[
                        styles.categorySelectBtn,
                        {
                          backgroundColor: isSelected ? meta.color : theme.inputBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categorySelectText,
                          {
                            color: isSelected ? '#FFFFFF' : theme.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {meta.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Icon Picker */}
              <Text style={[styles.formSectionLabel, { color: theme.textSecondary }]}>ICON</Text>
              <View style={styles.iconsGrid}>
                {HABIT_ICONS.map((ic) => {
                  const isSelected = newIcon === ic.name;
                  return (
                    <TouchableOpacity
                      key={ic.name}
                      onPress={() => setNewIcon(ic.name)}
                      style={[
                        styles.iconPickerBtn,
                        {
                          backgroundColor: isSelected ? newColor : theme.inputBackground,
                        },
                      ]}
                    >
                      <Ionicons
                        name={ic.name}
                        size={20}
                        color={isSelected ? '#FFFFFF' : theme.text}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Color Palette */}
              <Text style={[styles.formSectionLabel, { color: theme.textSecondary }]}>COLOR</Text>
              <View style={styles.colorsRow}>
                {HABIT_COLORS.map((col) => {
                  const isSelected = newColor === col;
                  return (
                    <TouchableOpacity
                      key={col}
                      onPress={() => setNewColor(col)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: col },
                        isSelected && styles.colorCircleSelected,
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Notes Input */}
              <Text style={[styles.formSectionLabel, { color: theme.textSecondary }]}>NOTES (OPTIONAL)</Text>
              <View style={[styles.modalInputWrapper, { backgroundColor: theme.inputBackground }]}>
                <TextInput
                  placeholder="e.g. 30 mins, 5km, after waking up..."
                  placeholderTextColor={theme.textTertiary}
                  value={newNotes}
                  onChangeText={setNewNotes}
                  style={[styles.modalTextInput, { color: theme.text }]}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- FULL MONTH CALENDAR MODAL --- */}
      <Modal
        visible={isCalendarVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsCalendarVisible(false)}
      >
        <View style={styles.calendarModalBackdrop}>
          <View style={[styles.calendarCard, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF', borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.calendarHeaderRow}>
              <TouchableOpacity
                onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                style={styles.calNavBtn}
              >
                <Ionicons name="chevron-back" size={18} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.calendarMonthTitle, { color: theme.text }]}>
                {calendarMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                onPress={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                style={styles.calNavBtn}
              >
                <Ionicons name="chevron-forward" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Day name headers: Sun to Sat */}
            <View style={styles.calendarWeekdaysRow}>
              {DAY_LABELS.map((dLabel) => (
                <Text key={dLabel} style={[styles.calendarWeekdayText, { color: theme.textSecondary }]}>
                  {dLabel}
                </Text>
              ))}
            </View>

            {/* Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((item, idx) => {
                const isSelected = item.dateStr === selectedDateStr;
                const isToday = item.dateStr === todayStr;
                const hasCompletion = datesWithCompletions.has(item.dateStr);

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => selectCalendarDate(item.dateObj)}
                    style={[
                      styles.calendarDayCell,
                      isSelected && { backgroundColor: '#E05368' },
                      isToday && !isSelected && { borderColor: '#E05368', borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : item.isCurrentMonth
                            ? theme.text
                            : theme.textTertiary,
                          fontWeight: isSelected || isToday ? '700' : '400',
                        },
                      ]}
                    >
                      {item.dayNumber}
                    </Text>
                    {hasCompletion && (
                      <View
                        style={[
                          styles.calDot,
                          { backgroundColor: isSelected ? '#FFFFFF' : '#30D158' },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setIsCalendarVisible(false)}
              style={[styles.closeCalBtn, { backgroundColor: theme.inputBackground }]}
            >
              <Text style={[styles.closeCalBtnText, { color: theme.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hamburgerContainer: {
    width: 22,
    height: 16,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    height: 2.8,
    width: '100%',
    borderRadius: 2,
    backgroundColor: '#E05368', // Salmon/coral lines
  },
  titleWrapper: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconBtn: {
    padding: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterChipList: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12.5,
  },
  flexibleWeekWrapper: {
    paddingTop: 4,
    paddingBottom: 10,
  },
  dateStripScrollContent: {
    paddingHorizontal: 14,
    gap: CAPSULE_GAP,
  },
  dayCapsule: {
    width: CAPSULE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    minHeight: 64,
  },
  dayCapsuleActive: {
    backgroundColor: '#E05368', // Coral / Red pill in user photo
    shadowColor: '#E05368',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  dayCapsuleInactive: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dayLabelText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayLabelActiveText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '700',
  },
  dayNumText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dayNumActiveText: {
    color: '#FFFFFF',
  },
  completionDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.5,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  progressCard: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 4.5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  thinStripsContainer: {
    gap: 8,
  },
  thinStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  thinStripCompleted: {
    opacity: 0.78,
  },
  compactIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stripTitleWrapper: {
    flex: 1,
  },
  stripTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  stripTitleStrikethrough: {
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    opacity: 0.6,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  checkCircleActive: {
    // green filled
  },
  checkCircleInactive: {
    borderWidth: 1.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  fabBtn: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E05368',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E05368',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.38,
    shadowRadius: 5,
    elevation: 5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouchable: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
  },
  modalGrabberWrapper: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  modalGrabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalCancelText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 16,
  },
  formSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 14,
  },
  modalInputWrapper: {
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    justifyContent: 'center',
  },
  modalTextInput: {
    fontSize: 15,
  },
  freqPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  freqPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  freqPillText: {
    fontSize: 13,
  },
  specificDaysContainer: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  subHintText: {
    fontSize: 12,
    marginBottom: 8,
  },
  daysToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayToggleCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToggleCircleText: {
    fontSize: 11.5,
  },
  particularCalendarBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  miniCalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  miniCalNavBtn: {
    padding: 4,
  },
  miniCalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  miniCalWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  miniCalWeekdayText: {
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  miniCalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  miniCalCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  miniCalCellText: {
    fontSize: 12,
  },
  selectedDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectedDateBadgeText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categorySelectBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  categorySelectText: {
    fontSize: 12.5,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconPickerBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  calendarModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calNavBtn: {
    padding: 6,
  },
  calendarMonthTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarWeekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11.5,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDayCell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
  },
  calendarDayText: {
    fontSize: 13,
  },
  calDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    marginTop: 1,
  },
  closeCalBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeCalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
