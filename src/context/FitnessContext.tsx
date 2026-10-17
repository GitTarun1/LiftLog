import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  BodyWeightEntry,
  Exercise,
  Habit,
  HabitCategory,
  HabitFrequency,
  MuscleGroup,
  StreakStats,
  UserPreferences,
  WorkoutLog,
  WorkoutSet,
} from '../types/fitness';
import { FitnessStorage } from '../services/storage';

interface FitnessContextValue {
  exercises: Exercise[];
  workoutLogs: WorkoutLog[];
  bodyWeightEntries: BodyWeightEntry[];
  habits: Habit[];
  userPrefs: UserPreferences;
  streakStats: StreakStats;
  isLoading: boolean;
  addExercise: (
    name: string,
    category: MuscleGroup,
    exerciseType?: Exercise['exerciseType'],
    notes?: string
  ) => Promise<Exercise>;
  deleteExercise: (id: string) => Promise<void>;
  addWorkoutLog: (log: {
    exerciseId: string;
    date: string;
    sets: WorkoutSet[];
    notes?: string;
  }) => Promise<WorkoutLog>;
  deleteWorkoutLog: (id: string) => Promise<void>;
  addBodyWeight: (weight: number, dateStr?: string, note?: string) => Promise<BodyWeightEntry>;
  deleteBodyWeight: (id: string) => Promise<void>;
  addHabit: (habitData: {
    title: string;
    category: HabitCategory;
    frequency?: HabitFrequency;
    specificDays?: number[];
    targetDate?: string;
    icon?: string;
    color?: string;
    notes?: string;
  }) => Promise<Habit>;
  toggleHabit: (id: string, dateStr?: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  updateHabit: (habit: Habit) => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  refreshData: () => Promise<void>;
}

const FitnessContext = createContext<FitnessContextValue | null>(null);

export const FitnessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [bodyWeightEntries, setBodyWeightEntries] = useState<BodyWeightEntry[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    weightUnit: 'kg',
    colorTheme: 'dark',
  });
  const [streakStats, setStreakStats] = useState<StreakStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalWorkoutDays: 0,
    workoutDates: [],
    thisWeekCount: 0,
    thisMonthCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      await FitnessStorage.initStorage();
      const [storedExercises, storedLogs, storedWeights, storedPrefs, storedHabits] =
        await Promise.all([
          FitnessStorage.getExercises(),
          FitnessStorage.getWorkoutLogs(),
          FitnessStorage.getBodyWeightEntries(),
          FitnessStorage.getUserPreferences(),
          FitnessStorage.getHabits(),
        ]);

      setExercises(storedExercises);
      setWorkoutLogs(storedLogs);
      setBodyWeightEntries(storedWeights);
      setUserPrefs(storedPrefs);
      setHabits(storedHabits);
      setStreakStats(FitnessStorage.calculateStreakStats(storedLogs));
    } catch (e) {
      console.error('Error loading LiftLog state:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addExercise = async (
    name: string,
    category: MuscleGroup,
    exerciseType?: Exercise['exerciseType'],
    notes?: string
  ) => {
    const created = await FitnessStorage.addExercise(name, category, exerciseType, notes);
    setExercises((prev) => [created, ...prev]);
    return created;
  };

  const deleteExercise = async (id: string) => {
    await FitnessStorage.deleteExercise(id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
    setWorkoutLogs((prev) => {
      const filtered = prev.filter((l) => l.exerciseId !== id);
      setStreakStats(FitnessStorage.calculateStreakStats(filtered));
      return filtered;
    });
  };

  const addWorkoutLog = async (log: {
    exerciseId: string;
    date: string;
    sets: WorkoutSet[];
    notes?: string;
  }) => {
    const created = await FitnessStorage.addWorkoutLog(log);
    setWorkoutLogs((prev) => {
      const updated = [created, ...prev];
      setStreakStats(FitnessStorage.calculateStreakStats(updated));
      return updated;
    });
    return created;
  };

  const deleteWorkoutLog = async (id: string) => {
    await FitnessStorage.deleteWorkoutLog(id);
    setWorkoutLogs((prev) => {
      const filtered = prev.filter((l) => l.id !== id);
      setStreakStats(FitnessStorage.calculateStreakStats(filtered));
      return filtered;
    });
  };

  const addBodyWeight = async (weight: number, dateStr?: string, note?: string) => {
    const created = await FitnessStorage.addBodyWeightEntry(weight, dateStr, note);
    const updated = await FitnessStorage.getBodyWeightEntries();
    setBodyWeightEntries(updated);
    return created;
  };

  const deleteBodyWeight = async (id: string) => {
    await FitnessStorage.deleteBodyWeightEntry(id);
    setBodyWeightEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const addHabit = async (habitData: {
    title: string;
    category: HabitCategory;
    frequency?: HabitFrequency;
    icon?: string;
    color?: string;
    notes?: string;
  }) => {
    const created = await FitnessStorage.addHabit(habitData);
    setHabits((prev) => [created, ...prev]);
    return created;
  };

  const toggleHabit = async (id: string, dateStr?: string) => {
    const updated = await FitnessStorage.toggleHabitCompletion(id, dateStr);
    setHabits(updated);
  };

  const deleteHabit = async (id: string) => {
    await FitnessStorage.deleteHabit(id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const updateHabit = async (habit: Habit) => {
    await FitnessStorage.updateHabit(habit);
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? habit : h)));
  };

  const updatePreferences = async (prefs: Partial<UserPreferences>) => {
    const updated = await FitnessStorage.saveUserPreferences(prefs);
    setUserPrefs(updated);
  };

  return (
    <FitnessContext.Provider
      value={{
        exercises,
        workoutLogs,
        bodyWeightEntries,
        habits,
        userPrefs,
        streakStats,
        isLoading,
        addExercise,
        deleteExercise,
        addWorkoutLog,
        deleteWorkoutLog,
        addBodyWeight,
        deleteBodyWeight,
        addHabit,
        toggleHabit,
        deleteHabit,
        updateHabit,
        updatePreferences,
        refreshData: loadAll,
      }}
    >
      {children}
    </FitnessContext.Provider>
  );
};

export function useFitness() {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error('useFitness must be used within a FitnessProvider');
  }
  return context;
}
