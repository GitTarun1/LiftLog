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
import { MuscleGroup } from '../types/fitness';

interface AddExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, category: MuscleGroup, notes?: string) => Promise<any> | void;
}

const CATEGORIES: { label: string; value: MuscleGroup; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Chest', value: 'chest', icon: 'barbell-outline' },
  { label: 'Back', value: 'back', icon: 'body-outline' },
  { label: 'Legs', value: 'legs', icon: 'walk-outline' },
  { label: 'Shoulders', value: 'shoulders', icon: 'shield-outline' },
  { label: 'Arms', value: 'arms', icon: 'fitness-outline' },
  { label: 'Core', value: 'core', icon: 'disc-outline' },
  { label: 'Full Body', value: 'full_body', icon: 'flame-outline' },
  { label: 'Cardio', value: 'cardio', icon: 'heart-outline' },
  { label: 'Other', value: 'other', icon: 'ellipsis-horizontal-outline' },
];

export function AddExerciseModal({ visible, onClose, onAdd }: AddExerciseModalProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MuscleGroup>('chest');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter an exercise name');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onAdd(name.trim(), category, notes.trim() || undefined);
      setName('');
      setCategory('chest');
      setNotes('');
      onClose();
    } catch (e) {
      console.error(e);
      setError('Failed to save exercise.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
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

          {/* iOS Navigation Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
              <Text style={[styles.cancelText, { color: theme.tint }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>New Exercise</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting || !name.trim()}
              style={styles.headerBtn}
            >
              <Text
                style={[
                  styles.saveText,
                  {
                    color: !name.trim() || isSubmitting ? theme.textSecondary : theme.tint,
                  },
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Error Message */}
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Exercise Name Input */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              EXERCISE NAME
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.inputBackground }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="e.g. Incline Bench Press"
                placeholderTextColor={theme.textTertiary}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (error) setError('');
                }}
                autoCapitalize="words"
                returnKeyType="done"
              />
              {name.length > 0 && (
                <TouchableOpacity onPress={() => setName('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Muscle Group Selector */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 20 }]}>
              TARGET MUSCLE GROUP
            </Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    activeOpacity={0.7}
                    onPress={() => setCategory(cat.value)}
                    style={[
                      styles.categoryPill,
                      {
                        backgroundColor: isSelected ? theme.tint : theme.inputBackground,
                        borderColor: isSelected ? theme.tint : theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={15}
                      color={isSelected ? '#FFFFFF' : theme.textSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.categoryLabel,
                        {
                          color: isSelected ? '#FFFFFF' : theme.text,
                          fontWeight: isSelected ? '600' : '400',
                        },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Form Cues & Notes */}
            <Text style={[styles.inputLabel, { color: theme.textSecondary, marginTop: 20 }]}>
              FORM NOTES / CUES (OPTIONAL)
            </Text>
            <View
              style={[
                styles.inputWrapper,
                styles.textAreaWrapper,
                { backgroundColor: theme.inputBackground },
              ]}
            >
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.text }]}
                placeholder="e.g. Pinch shoulder blades, 4-second eccentric, seat at pin 3"
                placeholderTextColor={theme.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
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
    padding: 20,
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
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  clearBtn: {
    padding: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryLabel: {
    fontSize: 13,
  },
  textAreaWrapper: {
    minHeight: 80,
    paddingVertical: 8,
  },
  textArea: {
    minHeight: 64,
  },
});
