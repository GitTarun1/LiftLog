import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BodyWeightEntry,
  Exercise,
  ExerciseStats,
  StreakStats,
  UserPreferences,
  WorkoutLog,
} from '../types/fitness';
import {
  DEFAULT_EXERCISES,
  generateInitialBodyWeight,
  generateInitialLogs,
} from './seedData';

const STORAGE_KEYS = {
  EXERCISES: '@liftlog_exercises_v1',
  WORKOUT_LOGS: '@liftlog_workout_logs_v1',
  BODY_WEIGHT: '@liftlog_body_weight_v1',
  USER_PREFS: '@liftlog_user_prefs_v1',
  INITIALIZED: '@liftlog_initialized_v1',
};

const DEFAULT_PREFERENCES: UserPreferences = {
  weightUnit: 'kg',
  colorTheme: 'dark',
};

export const FitnessStorage = {
  // Ensure default demo data is populated on first app launch
  async initStorage(): Promise<void> {
    try {
      const initialized = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!initialized) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.EXERCISES,
          JSON.stringify(DEFAULT_EXERCISES)
        );
        await AsyncStorage.setItem(
          STORAGE_KEYS.WORKOUT_LOGS,
          JSON.stringify(generateInitialLogs())
        );
        await AsyncStorage.setItem(
          STORAGE_KEYS.BODY_WEIGHT,
          JSON.stringify(generateInitialBodyWeight())
        );
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_PREFS,
          JSON.stringify(DEFAULT_PREFERENCES)
        );
        await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      }
    } catch (e) {
      console.error('Failed to initialize LiftLog storage:', e);
    }
  },

  // Reset demo data
  async resetToDemoData(): Promise<void> {
    await AsyncStorage.setItem(
      STORAGE_KEYS.EXERCISES,
      JSON.stringify(DEFAULT_EXERCISES)
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.WORKOUT_LOGS,
      JSON.stringify(generateInitialLogs())
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.BODY_WEIGHT,
      JSON.stringify(generateInitialBodyWeight())
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_PREFS,
      JSON.stringify(DEFAULT_PREFERENCES)
    );
  },

  // --- Exercises ---
  async getExercises(): Promise<Exercise[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.EXERCISES);
      if (!data) {
        await this.initStorage();
        return DEFAULT_EXERCISES;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error getting exercises:', e);
      return DEFAULT_EXERCISES;
    }
  },

  async addExercise(name: string, category: Exercise['category'], notes?: string): Promise<Exercise> {
    const exercises = await this.getExercises();
    const newExercise: Exercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      category,
      notes: notes?.trim(),
      createdAt: Date.now(),
      isCustom: true,
    };
    const updated = [newExercise, ...exercises];
    await AsyncStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(updated));
    return newExercise;
  },

  async deleteExercise(id: string): Promise<void> {
    const exercises = await this.getExercises();
    const filtered = exercises.filter((ex) => ex.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(filtered));

    // Also remove logs for this exercise
    const logs = await this.getWorkoutLogs();
    const filteredLogs = logs.filter((l) => l.exerciseId !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(filteredLogs));
  },

  // --- Workout Logs ---
  async getWorkoutLogs(): Promise<WorkoutLog[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS);
      if (!data) return [];
      const parsed: WorkoutLog[] = JSON.parse(data);
      // sort by date / timestamp descending
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('Error getting workout logs:', e);
      return [];
    }
  },

  async getExerciseLogs(exerciseId: string): Promise<WorkoutLog[]> {
    const logs = await this.getWorkoutLogs();
    return logs.filter((l) => l.exerciseId === exerciseId);
  },

  async addWorkoutLog(log: {
    exerciseId: string;
    date: string;
    sets: WorkoutLog['sets'];
    notes?: string;
  }): Promise<WorkoutLog> {
    const logs = await this.getWorkoutLogs();
    const dateObj = new Date(log.date);
    const newLog: WorkoutLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      exerciseId: log.exerciseId,
      date: log.date,
      timestamp: isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime(),
      sets: log.sets,
      notes: log.notes?.trim(),
    };
    const updated = [newLog, ...logs];
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(updated));
    return newLog;
  },

  async updateWorkoutLog(updatedLog: WorkoutLog): Promise<void> {
    const logs = await this.getWorkoutLogs();
    const index = logs.findIndex((l) => l.id === updatedLog.id);
    if (index >= 0) {
      logs[index] = updatedLog;
      await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(logs));
    }
  },

  async deleteWorkoutLog(id: string): Promise<void> {
    const logs = await this.getWorkoutLogs();
    const filtered = logs.filter((l) => l.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(filtered));
  },

  // --- Body Weight ---
  async getBodyWeightEntries(): Promise<BodyWeightEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BODY_WEIGHT);
      if (!data) return [];
      const parsed: BodyWeightEntry[] = JSON.parse(data);
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('Error getting body weight entries:', e);
      return [];
    }
  },

  async addBodyWeightEntry(weight: number, dateStr?: string, note?: string): Promise<BodyWeightEntry> {
    const entries = await this.getBodyWeightEntries();
    const date = dateStr ? new Date(dateStr) : new Date();
    const dateFormatted = dateStr || date.toISOString().split('T')[0];

    const newEntry: BodyWeightEntry = {
      id: `bw-${Date.now()}`,
      date: dateFormatted,
      timestamp: date.getTime(),
      weight: parseFloat(weight.toFixed(1)),
      note: note?.trim(),
    };

    // If an entry for the exact date already exists, update it, otherwise prepend
    const existingIndex = entries.findIndex((e) => e.date === dateFormatted);
    let updated: BodyWeightEntry[];
    if (existingIndex >= 0) {
      entries[existingIndex] = newEntry;
      updated = [...entries];
    } else {
      updated = [newEntry, ...entries];
    }

    updated.sort((a, b) => b.timestamp - a.timestamp);
    await AsyncStorage.setItem(STORAGE_KEYS.BODY_WEIGHT, JSON.stringify(updated));
    return newEntry;
  },

  async deleteBodyWeightEntry(id: string): Promise<void> {
    const entries = await this.getBodyWeightEntries();
    const filtered = entries.filter((e) => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.BODY_WEIGHT, JSON.stringify(filtered));
  },

  // --- Preferences ---
  async getUserPreferences(): Promise<UserPreferences> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFS);
      if (!data) return DEFAULT_PREFERENCES;
      return JSON.parse(data);
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  async saveUserPreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getUserPreferences();
    const updated = { ...current, ...prefs };
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFS, JSON.stringify(updated));
    return updated;
  },

  // --- Analytics & Computations ---
  calculateExerciseStats(exerciseId: string, logs: WorkoutLog[]): ExerciseStats {
    const exerciseLogs = logs.filter((l) => l.exerciseId === exerciseId);
    let maxWeight = 0;
    let maxVolume = 0;
    let estimated1RM = 0;
    let lastLoggedDate: string | undefined;
    let lastWeight: number | undefined;
    let lastReps: number | undefined;
    let lastSetsCount: number | undefined;

    exerciseLogs.forEach((log) => {
      let sessionVolume = 0;
      log.sets.forEach((set) => {
        if (set.weight > maxWeight) {
          maxWeight = set.weight;
        }
        sessionVolume += set.weight * set.reps;
        // Epley formula: 1RM = Weight * (1 + Reps / 30)
        const e1rm = Math.round(set.weight * (1 + set.reps / 30));
        if (e1rm > estimated1RM) {
          estimated1RM = e1rm;
        }
      });
      if (sessionVolume > maxVolume) {
        maxVolume = sessionVolume;
      }
    });

    if (exerciseLogs.length > 0) {
      // Sort by date desc
      const sorted = [...exerciseLogs].sort((a, b) => b.timestamp - a.timestamp);
      const latest = sorted[0];
      lastLoggedDate = latest.date;
      lastSetsCount = latest.sets.length;
      if (latest.sets.length > 0) {
        const topSet = [...latest.sets].sort((a, b) => b.weight - a.weight)[0];
        lastWeight = topSet.weight;
        lastReps = topSet.reps;
      }
    }

    return {
      exerciseId,
      totalWorkouts: exerciseLogs.length,
      maxWeight,
      maxVolume,
      estimated1RM: estimated1RM > 0 ? estimated1RM : maxWeight,
      lastLoggedDate,
      lastWeight,
      lastReps,
      lastSetsCount,
    };
  },

  calculateStreakStats(logs: WorkoutLog[]): StreakStats {
    if (logs.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalWorkoutDays: 0,
        workoutDates: [],
        thisWeekCount: 0,
        thisMonthCount: 0,
      };
    }

    // Get unique sorted dates in YYYY-MM-DD
    const dateSet = new Set<string>();
    logs.forEach((log) => {
      if (log.date) {
        dateSet.add(log.date);
      }
    });

    const uniqueDates = Array.from(dateSet).sort(); // ascending '2026-01-01', '2026-01-02'
    const totalWorkoutDays = uniqueDates.length;

    // Helper for date difference in calendar days
    const parseDateToUtc = (dStr: string) => {
      const [y, m, d] = dStr.split('-').map(Number);
      return Date.UTC(y, m - 1, d);
    };

    const oneDayMs = 86400000;

    // Calculate Longest Streak
    let longestStreak = 0;
    let currentStreakCount = 0;
    let prevDateMs: number | null = null;

    for (const dStr of uniqueDates) {
      const curDateMs = parseDateToUtc(dStr);
      if (prevDateMs === null) {
        currentStreakCount = 1;
      } else {
        const diffDays = Math.round((curDateMs - prevDateMs) / oneDayMs);
        if (diffDays === 1) {
          currentStreakCount += 1;
        } else if (diffDays > 1) {
          currentStreakCount = 1;
        }
      }
      if (currentStreakCount > longestStreak) {
        longestStreak = currentStreakCount;
      }
      prevDateMs = curDateMs;
    }

    // Calculate Current Streak based on today/yesterday
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    let currentStreak = 0;
    if (uniqueDates.length > 0) {
      const lastDateMs = parseDateToUtc(uniqueDates[uniqueDates.length - 1]);
      const diffFromToday = Math.round((todayUtc - lastDateMs) / oneDayMs);

      // If last workout was today or yesterday, streak is alive!
      if (diffFromToday === 0 || diffFromToday === 1) {
        currentStreak = 1;
        let checkDateMs = lastDateMs;
        for (let i = uniqueDates.length - 2; i >= 0; i--) {
          const prevMs = parseDateToUtc(uniqueDates[i]);
          const gap = Math.round((checkDateMs - prevMs) / oneDayMs);
          if (gap === 1) {
            currentStreak += 1;
            checkDateMs = prevMs;
          } else {
            break;
          }
        }
      } else {
        currentStreak = 0;
      }
    }

    // Counts for this week and this month
    const startOfWeekUtc = todayUtc - now.getDay() * oneDayMs;
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let thisWeekCount = 0;
    let thisMonthCount = 0;

    uniqueDates.forEach((dStr) => {
      const dMs = parseDateToUtc(dStr);
      if (dMs >= startOfWeekUtc && dMs <= todayUtc + oneDayMs) {
        thisWeekCount += 1;
      }
      if (dStr.startsWith(currentMonthPrefix)) {
        thisMonthCount += 1;
      }
    });

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      totalWorkoutDays,
      workoutDates: uniqueDates,
      thisWeekCount,
      thisMonthCount,
    };
  },

  // --- Backup / Restore ---
  async exportAllData(): Promise<string> {
    const [exercises, workoutLogs, bodyWeightEntries, userPrefs] = await Promise.all([
      this.getExercises(),
      this.getWorkoutLogs(),
      this.getBodyWeightEntries(),
      this.getUserPreferences(),
    ]);
    const payload = {
      appName: 'LiftLog',
      version: 1,
      exportedAt: new Date().toISOString(),
      exercises,
      workoutLogs,
      bodyWeightEntries,
      userPrefs,
    };
    return JSON.stringify(payload, null, 2);
  },

  async importAllData(jsonString: string): Promise<void> {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Backup data is empty or invalid.');
    }
    let payload: any;
    try {
      payload = JSON.parse(jsonString);
    } catch {
      throw new Error('Could not parse backup file as JSON.');
    }

    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid backup structure.');
    }

    // Support both versioned backups and raw dumps
    const exercises = Array.isArray(payload.exercises) ? payload.exercises : null;
    const workoutLogs = Array.isArray(payload.workoutLogs) ? payload.workoutLogs : null;
    const bodyWeightEntries = Array.isArray(payload.bodyWeightEntries) ? payload.bodyWeightEntries : null;
    const userPrefs = payload.userPrefs && typeof payload.userPrefs === 'object' ? payload.userPrefs : null;

    if (!exercises && !workoutLogs && !bodyWeightEntries) {
      throw new Error('The selected file does not contain valid LiftLog data.');
    }

    if (exercises) {
      await AsyncStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(exercises));
    }
    if (workoutLogs) {
      await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(workoutLogs));
    }
    if (bodyWeightEntries) {
      await AsyncStorage.setItem(STORAGE_KEYS.BODY_WEIGHT, JSON.stringify(bodyWeightEntries));
    }
    if (userPrefs) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFS, JSON.stringify(userPrefs));
    }
    await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  },
};
