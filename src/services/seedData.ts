import { BodyWeightEntry, Exercise, WorkoutLog } from '../types/fitness';

export const DEFAULT_EXERCISES: Exercise[] = [
  {
    id: 'ex-bench-press',
    name: 'Barbell Bench Press',
    category: 'chest',
    notes: 'Keep shoulder blades retracted and arched slightly.',
    createdAt: Date.now() - 90 * 86400000,
  },
  {
    id: 'ex-squat',
    name: 'Barbell Back Squat',
    category: 'legs',
    notes: 'Hit parallel or below, knees tracking toes.',
    createdAt: Date.now() - 90 * 86400000,
  },
  {
    id: 'ex-deadlift',
    name: 'Conventional Deadlift',
    category: 'back',
    notes: 'Engage lats, push floor away through heels.',
    createdAt: Date.now() - 90 * 86400000,
  },
  {
    id: 'ex-overhead-press',
    name: 'Overhead Press (OHP)',
    category: 'shoulders',
    notes: 'Brace core and glutes throughout full range of motion.',
    createdAt: Date.now() - 85 * 86400000,
  },
  {
    id: 'ex-barbell-row',
    name: 'Bent Over Barbell Row',
    category: 'back',
    notes: 'Hinged at 45 degrees, pull to lower sternum.',
    createdAt: Date.now() - 80 * 86400000,
  },
  {
    id: 'ex-incline-db-press',
    name: 'Incline Dumbbell Press',
    category: 'chest',
    notes: '30 degree bench angle, controlled eccentric.',
    createdAt: Date.now() - 75 * 86400000,
  },
  {
    id: 'ex-pullup',
    name: 'Pull-Up',
    category: 'back',
    notes: 'Full dead hang to chin over bar.',
    createdAt: Date.now() - 70 * 86400000,
  },
  {
    id: 'ex-romanian-deadlift',
    name: 'Romanian Deadlift (RDL)',
    category: 'legs',
    notes: 'Deep hamstring stretch, soft knee bend.',
    createdAt: Date.now() - 65 * 86400000,
  },
  {
    id: 'ex-lateral-raise',
    name: 'Dumbbell Lateral Raise',
    category: 'shoulders',
    notes: 'Slight forward lean, raise in scapular plane.',
    createdAt: Date.now() - 60 * 86400000,
  },
  {
    id: 'ex-bicep-curl',
    name: 'Incline Dumbbell Curl',
    category: 'arms',
    notes: 'Strict form, minimize shoulder swing.',
    createdAt: Date.now() - 55 * 86400000,
  },
  {
    id: 'ex-tricep-pushdown',
    name: 'Triceps Rope Pushdown',
    category: 'arms',
    notes: 'Flare rope out at bottom contraction.',
    createdAt: Date.now() - 50 * 86400000,
  },
  {
    id: 'ex-hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'core',
    notes: 'Posterior pelvic tilt at the top.',
    createdAt: Date.now() - 40 * 86400000,
  },
];

// Helper to format Date to YYYY-MM-DD
function formatYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate realistic workout history for Bench Press, Squat, Deadlift, OHP
export function generateInitialLogs(): WorkoutLog[] {
  const logs: WorkoutLog[] = [];
  const now = new Date();

  // Bench Press Progression over 10 weeks (1 session per week)
  const benchWeights = [80, 82.5, 82.5, 85, 85, 87.5, 87.5, 90, 92.5, 95];
  for (let i = 0; i < benchWeights.length; i++) {
    const daysAgo = (benchWeights.length - 1 - i) * 7 + 1;
    const date = new Date(now.getTime() - daysAgo * 86400000);
    const w = benchWeights[i];
    logs.push({
      id: `log-bench-${i}`,
      exerciseId: 'ex-bench-press',
      date: formatYYYYMMDD(date),
      timestamp: date.getTime(),
      notes: i === benchWeights.length - 1 ? 'New PR! Felt solid in the pocket.' : undefined,
      sets: [
        { id: `s-b-${i}-1`, setNumber: 1, weight: w - 10, reps: 8, isWarmup: true },
        { id: `s-b-${i}-2`, setNumber: 2, weight: w, reps: 5, rpe: 8 },
        { id: `s-b-${i}-3`, setNumber: 3, weight: w, reps: 5, rpe: 8.5 },
        { id: `s-b-${i}-4`, setNumber: 4, weight: w, reps: 5, rpe: 9 },
      ],
    });
  }

  // Squat Progression over 9 weeks
  const squatWeights = [100, 102.5, 105, 107.5, 110, 112.5, 115, 117.5, 120];
  for (let i = 0; i < squatWeights.length; i++) {
    const daysAgo = (squatWeights.length - 1 - i) * 7 + 3;
    const date = new Date(now.getTime() - daysAgo * 86400000);
    const w = squatWeights[i];
    logs.push({
      id: `log-squat-${i}`,
      exerciseId: 'ex-squat',
      date: formatYYYYMMDD(date),
      timestamp: date.getTime(),
      notes: i === squatWeights.length - 1 ? 'Depth was deep, back kept upright.' : undefined,
      sets: [
        { id: `s-sq-${i}-1`, setNumber: 1, weight: w - 15, reps: 6, isWarmup: true },
        { id: `s-sq-${i}-2`, setNumber: 2, weight: w, reps: 5, rpe: 8 },
        { id: `s-sq-${i}-3`, setNumber: 3, weight: w, reps: 5, rpe: 8.5 },
        { id: `s-sq-${i}-4`, setNumber: 4, weight: w, reps: 4, rpe: 9.5 },
      ],
    });
  }

  // Deadlift Progression over 8 weeks
  const deadliftWeights = [120, 125, 127.5, 130, 135, 137.5, 140, 145];
  for (let i = 0; i < deadliftWeights.length; i++) {
    const daysAgo = (deadliftWeights.length - 1 - i) * 7 + 5;
    const date = new Date(now.getTime() - daysAgo * 86400000);
    const w = deadliftWeights[i];
    logs.push({
      id: `log-dl-${i}`,
      exerciseId: 'ex-deadlift',
      date: formatYYYYMMDD(date),
      timestamp: date.getTime(),
      sets: [
        { id: `s-dl-${i}-1`, setNumber: 1, weight: w - 20, reps: 5, isWarmup: true },
        { id: `s-dl-${i}-2`, setNumber: 2, weight: w, reps: 5, rpe: 8 },
        { id: `s-dl-${i}-3`, setNumber: 3, weight: w, reps: 5, rpe: 9 },
      ],
    });
  }

  // Overhead press progression
  const ohpWeights = [50, 52.5, 52.5, 55, 55, 57.5, 60];
  for (let i = 0; i < ohpWeights.length; i++) {
    const daysAgo = (ohpWeights.length - 1 - i) * 7 + 2;
    const date = new Date(now.getTime() - daysAgo * 86400000);
    const w = ohpWeights[i];
    logs.push({
      id: `log-ohp-${i}`,
      exerciseId: 'ex-overhead-press',
      date: formatYYYYMMDD(date),
      timestamp: date.getTime(),
      sets: [
        { id: `s-ohp-${i}-1`, setNumber: 1, weight: w - 10, reps: 6, isWarmup: true },
        { id: `s-ohp-${i}-2`, setNumber: 2, weight: w, reps: 6, rpe: 8 },
        { id: `s-ohp-${i}-3`, setNumber: 3, weight: w, reps: 5, rpe: 9 },
      ],
    });
  }

  // Recent 3 days of workouts to give a lively active streak!
  // Yesterday and today workout logs
  const yesterday = new Date(now.getTime() - 86400000);
  logs.push({
    id: 'log-recent-incline',
    exerciseId: 'ex-incline-db-press',
    date: formatYYYYMMDD(yesterday),
    timestamp: yesterday.getTime(),
    notes: 'Good upper chest pump.',
    sets: [
      { id: 's-inc-1', setNumber: 1, weight: 30, reps: 10, rpe: 8 },
      { id: 's-inc-2', setNumber: 2, weight: 32, reps: 8, rpe: 8.5 },
      { id: 's-inc-3', setNumber: 3, weight: 32, reps: 8, rpe: 9 },
    ],
  });

  logs.push({
    id: 'log-recent-pullup',
    exerciseId: 'ex-pullup',
    date: formatYYYYMMDD(now),
    timestamp: now.getTime(),
    notes: 'Bodyweight + 10kg belt.',
    sets: [
      { id: 's-pu-1', setNumber: 1, weight: 10, reps: 8, rpe: 8 },
      { id: 's-pu-2', setNumber: 2, weight: 10, reps: 8, rpe: 8.5 },
      { id: 's-pu-3', setNumber: 3, weight: 10, reps: 7, rpe: 9.5 },
    ],
  });

  return logs;
}

// Generate realistic body weight progression over 12 weeks
export function generateInitialBodyWeight(): BodyWeightEntry[] {
  const entries: BodyWeightEntry[] = [];
  const now = new Date();
  const startingWeight = 78.5; // in kg
  // gentle leaning down / cutting trend with small natural daily fluctuations
  const count = 30; // 30 entries over last ~80 days

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(((count - 1 - i) / count) * 75);
    const date = new Date(now.getTime() - daysAgo * 86400000);
    // downward trend: -2.5kg total over 75 days, with +/- 0.4kg random fluctuation
    const progressFactor = i / count;
    const base = startingWeight - progressFactor * 2.8;
    const fluctuation = ((i * 17) % 7 - 3) * 0.12; // pseudo-random deterministic
    const weight = parseFloat((base + fluctuation).toFixed(1));

    entries.push({
      id: `bw-${i}`,
      date: formatYYYYMMDD(date),
      timestamp: date.getTime(),
      weight,
      note: i === count - 1 ? 'Morning weigh-in after fasting' : undefined,
    });
  }

  return entries;
}
