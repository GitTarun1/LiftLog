export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'full_body'
  | 'cardio'
  | 'other';

export interface WorkoutSet {
  id: string;
  setNumber: number;
  weight: number; // in user preferred unit (kg/lbs)
  reps: number;
  rpe?: number;
  isWarmup?: boolean;
}

export interface WorkoutLog {
  id: string;
  exerciseId: string;
  date: string; // 'YYYY-MM-DD'
  timestamp: number;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: MuscleGroup;
  notes?: string;
  createdAt: number;
  isCustom?: boolean;
}

export interface BodyWeightEntry {
  id: string;
  date: string; // 'YYYY-MM-DD'
  timestamp: number;
  weight: number;
  note?: string;
}

export interface UserPreferences {
  weightUnit: 'kg' | 'lbs';
  colorTheme: 'dark' | 'light';
}

export interface ExerciseStats {
  exerciseId: string;
  totalWorkouts: number;
  maxWeight: number;
  maxVolume: number;
  estimated1RM: number;
  lastLoggedDate?: string;
  lastWeight?: number;
  lastReps?: number;
  lastSetsCount?: number;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  totalWorkoutDays: number;
  workoutDates: string[]; // List of YYYY-MM-DD
  thisWeekCount: number;
  thisMonthCount: number;
}
