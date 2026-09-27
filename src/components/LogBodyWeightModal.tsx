import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface LogBodyWeightModalProps {
  visible: boolean;
  unit: string;
  lastWeight?: number;
  onClose: () => void;
  onSave: (weight: number, dateStr?: string, note?: string) => Promise<void>;
}

function LogBodyWeightForm({
  unit,
  lastWeight,
  onClose,
  onSave,
}: Omit<LogBodyWeightModalProps, 'visible'>) {
  const theme = useTheme();
  const [weight, setWeight] = useState(String(lastWeight || 75.0));
  const [dateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const adjustWeight = (delta: number) => {
    const current = parseFloat(weight) || 75.0;
    const next = Math.max(20, Math.min(300, current + delta));
    setWeight(next.toFixed(1));
  };

  const handleSave = async () => {
    const parsed = parseFloat(weight);
    if (isNaN(parsed) || parsed <= 20 || parsed >= 300) {
      setError('Please enter a valid weight (20 - 300).');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSave(parsed, dateStr, note.trim() || undefined);
      onClose();
    } catch (e) {
      console.error(e);
      setError('Failed to record body weight.');
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
      {/* Grabber */}
      <View style={styles.grabberWrapper}>
        <View style={styles.grabber} />
      </View>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
          <Text style={[styles.cancelText, { color: theme.tint }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Record Weight</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSubmitting}
          style={styles.headerBtn}
        >
          <Text style={[styles.saveText, { color: theme.tint }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Date display */}
        <View style={styles.dateRow}>
          <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>DATE</Text>
          <Text style={[styles.dateValue, { color: theme.text }]}>{dateStr}</Text>
        </View>

        {/* Big weight display with steppers */}
        <View style={styles.weightDisplayRow}>
          <TouchableOpacity
            onPress={() => adjustWeight(-0.5)}
            style={[styles.stepperCircle, { backgroundColor: theme.inputBackground }]}
          >
            <Ionicons name="remove" size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.centerInputWrapper}>
            <TextInput
              style={[styles.largeInput, { color: theme.text }]}
              keyboardType="numeric"
              value={weight}
              onChangeText={(t) => {
                setWeight(t);
                if (error) setError('');
              }}
              autoFocus
            />
            <Text style={[styles.largeUnit, { color: theme.textSecondary }]}>
              {unit}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => adjustWeight(0.5)}
            style={[styles.stepperCircle, { backgroundColor: theme.inputBackground }]}
          >
            <Ionicons name="add" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Micro adjustments (+/- 0.1) */}
        <View style={styles.quickChips}>
          <TouchableOpacity
            onPress={() => adjustWeight(-0.1)}
            style={[styles.chip, { backgroundColor: theme.inputBackground }]}
          >
            <Text style={[styles.chipText, { color: theme.textSecondary }]}>-0.1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => adjustWeight(-0.2)}
            style={[styles.chip, { backgroundColor: theme.inputBackground }]}
          >
            <Text style={[styles.chipText, { color: theme.textSecondary }]}>-0.2</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => adjustWeight(0.1)}
            style={[styles.chip, { backgroundColor: theme.inputBackground }]}
          >
            <Text style={[styles.chipText, { color: theme.textSecondary }]}>+0.1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => adjustWeight(0.2)}
            style={[styles.chip, { backgroundColor: theme.inputBackground }]}
          >
            <Text style={[styles.chipText, { color: theme.textSecondary }]}>+0.2</Text>
          </TouchableOpacity>
        </View>

        {/* Note field */}
        <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 20 }]}>
          NOTE (OPTIONAL)
        </Text>
        <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground }]}>
          <TextInput
            style={[styles.noteInput, { color: theme.text }]}
            placeholder="e.g. Fasted, post-workout, creatine retention"
            placeholderTextColor={theme.textTertiary}
            value={note}
            onChangeText={setNote}
          />
        </View>
      </View>
    </View>
  );
}

export function LogBodyWeightModal(props: LogBodyWeightModalProps) {
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
        <LogBodyWeightForm
          unit={props.unit}
          lastWeight={props.lastWeight}
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
    paddingHorizontal: 8,
    minWidth: 64,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
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
    padding: 24,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  weightDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 20,
  },
  stepperCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerInputWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    minWidth: 140,
  },
  largeInput: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 90,
    letterSpacing: -1,
  },
  largeUnit: {
    fontSize: 20,
    fontWeight: '500',
    marginLeft: 4,
  },
  quickChips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 46,
    justifyContent: 'center',
  },
  noteInput: {
    fontSize: 15,
    paddingVertical: 10,
  },
});
