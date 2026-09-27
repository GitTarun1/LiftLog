import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { Exercise, WorkoutSet } from '../types/fitness';

interface LogWorkoutModalProps {
  visible: boolean;
  exercise: Exercise;
  unit: string;
  lastLoggedSet?: { weight: number; reps: number };
  onClose: () => void;
  onSave: (sets: WorkoutSet[], notes?: string, date?: string) => Promise<void>;
}

function LogWorkoutForm({
  exercise,
  unit,
  lastLoggedSet,
  onClose,
  onSave,
}: Omit<LogWorkoutModalProps, 'visible'>) {
  const theme = useTheme();
  const defaultWeight = lastLoggedSet?.weight ?? 60;
  const defaultReps = lastLoggedSet?.reps ?? 8;

  const [dateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [sets, setSets] = useState<WorkoutSet[]>(() => [
    {
      id: `s-${Date.now()}-1`,
      setNumber: 1,
      weight: defaultWeight,
      reps: defaultReps,
      isWarmup: false,
    },
    {
      id: `s-${Date.now()}-2`,
      setNumber: 2,
      weight: defaultWeight,
      reps: defaultReps,
      isWarmup: false,
    },
    {
      id: `s-${Date.now()}-3`,
      setNumber: 3,
      weight: defaultWeight,
      reps: defaultReps,
      isWarmup: false,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addSet = () => {
    const lastSet = sets[sets.length - 1];
    const newSet: WorkoutSet = {
      id: `s-${Date.now()}-${sets.length + 1}`,
      setNumber: sets.length + 1,
      weight: lastSet ? lastSet.weight : 50,
      reps: lastSet ? lastSet.reps : 8,
      isWarmup: false,
    };
    setSets([...sets, newSet]);
  };

  const removeSet = (index: number) => {
    if (sets.length <= 1) return;
    const updated = sets
      .filter((_, i) => i !== index)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    setSets(updated);
  };

  const updateSetWeight = (index: number, val: number) => {
    const updated = [...sets];
    updated[index].weight = Math.max(0, parseFloat(val.toFixed(1)));
    setSets(updated);
  };

  const updateSetReps = (index: number, val: number) => {
    const updated = [...sets];
    updated[index].reps = Math.max(1, Math.round(val));
    setSets(updated);
  };

  const toggleWarmup = (index: number) => {
    const updated = [...sets];
    updated[index].isWarmup = !updated[index].isWarmup;
    setSets(updated);
  };

  const handleSave = async () => {
    if (sets.length === 0) {
      setError('Please add at least one set.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(sets, notes.trim() || undefined, dateStr);
      onClose();
    } catch (e) {
      console.error(e);
      setError('Failed to record workout.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      style={[
        styles.sheetContainer,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      {/* iOS Grabber */}
      <View style={styles.grabberWrapper}>
        <View style={styles.grabber} />
      </View>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
          <Text style={[styles.cancelText, { color: theme.tint }]}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrapper}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text style={[styles.subDate, { color: theme.textSecondary }]}>
            {dateStr || 'Today'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          style={styles.headerBtn}
        >
          <Text style={[styles.saveText, { color: theme.tint }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Table Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableColHeader, styles.colSet, { color: theme.textSecondary }]}>
            SET
          </Text>
          <Text style={[styles.tableColHeader, styles.colWeight, { color: theme.textSecondary }]}>
            WEIGHT ({unit})
          </Text>
          <Text style={[styles.tableColHeader, styles.colReps, { color: theme.textSecondary }]}>
            REPS
          </Text>
          <Text style={[styles.tableColHeader, styles.colWarm, { color: theme.textSecondary }]}>
            WARM
          </Text>
          <View style={styles.colAction} />
        </View>

        {/* Set Rows */}
        {sets.map((set, idx) => (
          <View
            key={set.id}
            style={[
              styles.setRow,
              {
                backgroundColor: theme.inputBackground,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Set number badge */}
            <View style={styles.colSet}>
              <View
                style={[
                  styles.setNumberBadge,
                  {
                    backgroundColor: set.isWarmup ? '#FF9F0A' : theme.tint,
                  },
                ]}
              >
                <Text style={styles.setNumberText}>
                  {set.isWarmup ? 'W' : set.setNumber}
                </Text>
              </View>
            </View>

            {/* Weight stepper (Wide to hold 3-4 digits e.g. 100, 142.5) */}
            <View style={[styles.stepperContainer, styles.colWeight]}>
              <TouchableOpacity
                onPress={() => updateSetWeight(idx, set.weight - 2.5)}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons name="remove" size={13} color={theme.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.numericInput, { color: theme.text }]}
                keyboardType="decimal-pad"
                value={String(set.weight)}
                selectTextOnFocus
                onChangeText={(t) => {
                  const v = parseFloat(t);
                  if (!isNaN(v)) updateSetWeight(idx, v);
                }}
              />
              <TouchableOpacity
                onPress={() => updateSetWeight(idx, set.weight + 2.5)}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons name="add" size={13} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Reps stepper */}
            <View style={[styles.stepperContainer, styles.colReps]}>
              <TouchableOpacity
                onPress={() => updateSetReps(idx, set.reps - 1)}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons name="remove" size={13} color={theme.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.numericInput, { color: theme.text }]}
                keyboardType="number-pad"
                value={String(set.reps)}
                selectTextOnFocus
                onChangeText={(t) => {
                  const v = parseInt(t, 10);
                  if (!isNaN(v)) updateSetReps(idx, v);
                }}
              />
              <TouchableOpacity
                onPress={() => updateSetReps(idx, set.reps + 1)}
                style={styles.stepBtn}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons name="add" size={13} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Warmup toggle */}
            <View style={styles.colWarm}>
              <TouchableOpacity
                onPress={() => toggleWarmup(idx)}
                style={[
                  styles.warmupToggle,
                  set.isWarmup && { backgroundColor: '#FF9F0A' },
                ]}
              >
                <Ionicons
                  name={set.isWarmup ? 'flame' : 'flame-outline'}
                  size={15}
                  color={set.isWarmup ? '#FFFFFF' : theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Delete set */}
            <View style={styles.colAction}>
              <TouchableOpacity
                onPress={() => removeSet(idx)}
                disabled={sets.length <= 1}
                style={styles.trashBtn}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={sets.length <= 1 ? theme.textTertiary : '#FF3B30'}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add Set Button & Quick Increments */}
        <View style={styles.addSetActionsRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={addSet}
            style={[
              styles.addSetBtn,
              { backgroundColor: theme.inputBackground, borderColor: theme.border },
            ]}
          >
            <Ionicons name="add-circle" size={17} color={theme.tint} />
            <Text style={[styles.addSetText, { color: theme.tint }]}>Add Set</Text>
          </TouchableOpacity>
        </View>

        {/* Quick weight adjustment chips */}
        <View style={styles.quickWeightRow}>
          <Text style={[styles.quickWeightLabel, { color: theme.textSecondary }]}>
            Quick adjust last set ({unit}):
          </Text>
          <View style={styles.quickWeightChips}>
            {[-5, -2.5, 2.5, 5, 10].map((delta) => (
              <TouchableOpacity
                key={delta}
                activeOpacity={0.65}
                onPress={() => {
                  if (sets.length === 0) return;
                  const lastIdx = sets.length - 1;
                  updateSetWeight(lastIdx, Math.max(0, sets[lastIdx].weight + delta));
                }}
                style={[styles.quickChip, { backgroundColor: theme.inputBackground }]}
              >
                <Text style={[styles.quickChipText, { color: theme.text }]}>
                  {delta > 0 ? `+${delta}` : delta}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Workout Notes */}
        <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 16 }]}>
          WORKOUT SESSION NOTES
        </Text>
        <View
          style={[
            styles.notesWrapper,
            { backgroundColor: theme.inputBackground },
          ]}
        >
          <TextInput
            style={[styles.notesInput, { color: theme.text }]}
            placeholder="RPE, energy level, or notes..."
            placeholderTextColor={theme.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />
        </View>
      </ScrollView>
    </View>
  );
}

export function LogWorkoutModal(props: LogWorkoutModalProps) {
  if (!props.visible) return null;

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent
      onRequestClose={props.onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={props.onClose}
        />
        <LogWorkoutForm
          exercise={props.exercise}
          unit={props.unit}
          lastLoggedSet={props.lastLoggedSet}
          onClose={props.onClose}
          onSave={props.onSave}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
  },
  grabberWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 60,
  },
  headerTitleWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subDate: {
    fontSize: 12,
    marginTop: 1,
  },
  cancelText: {
    fontSize: 16,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  colSet: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colWeight: {
    flex: 1.45,
    marginHorizontal: 3,
  },
  colReps: {
    flex: 1.05,
    marginHorizontal: 3,
  },
  colWarm: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colAction: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  setNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.14)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepBtn: {
    paddingVertical: 7,
    paddingHorizontal: 5,
  },
  numericInput: {
    flex: 1,
    minWidth: 42,
    textAlign: 'center',
    fontSize: 14.5,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  warmupToggle: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
  },
  trashBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetActionsRow: {
    marginTop: 4,
    marginBottom: 10,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  addSetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickWeightRow: {
    marginBottom: 12,
  },
  quickWeightLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  quickWeightChips: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesWrapper: {
    borderRadius: 12,
    padding: 10,
    minHeight: 54,
  },
  notesInput: {
    fontSize: 14,
  },
});
