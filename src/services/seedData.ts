import { BodyWeightEntry, Exercise, Habit, WorkoutLog } from '../types/fitness';

// Clean initial state without pre-added sample exercises
export const DEFAULT_EXERCISES: Exercise[] = [];

// Clean initial state without pre-added sample habits/todos
export const DEFAULT_HABITS: Habit[] = [];

// No dummy sample workout logs
export function generateInitialLogs(): WorkoutLog[] {
  return [];
}

// No dummy sample body weight entries
export function generateInitialBodyWeight(): BodyWeightEntry[] {
  return [];
}
