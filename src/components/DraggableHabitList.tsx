import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Habit } from '@/types/fitness';
import { ThemeColors } from '@/constants/theme';

interface DraggableHabitListProps {
  habits: Habit[];
  selectedDateStr: string;
  isDarkMode: boolean;
  theme: ThemeColors;
  onToggleHabit: (id: string, dateStr: string) => void;
  onDeleteHabit: (habit: Habit) => void;
  onReorder: (reorderedHabits: Habit[]) => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

const DEFAULT_ROW_HEIGHT = 64; // 56px row height + 8px gap

export const DraggableHabitList: React.FC<DraggableHabitListProps> = ({
  habits,
  selectedDateStr,
  isDarkMode,
  theme,
  onToggleHabit,
  onDeleteHabit,
  onReorder,
  onDragStateChange,
}) => {
  const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);

  // Animated values
  const dragTranslateY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;

  // Offsets for non-dragged rows to slide up/down
  const rowOffsets = useRef<{ [key: string]: Animated.Value }>({}).current;

  // Mutable refs for tracking active drag inside PanResponders
  const activeIndexRef = useRef<number | null>(null);
  const targetIndexRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const habitsRef = useRef(habits);
  habitsRef.current = habits;
  const rowHeightRef = useRef(rowHeight);
  rowHeightRef.current = rowHeight;
  const holdTimerRef = useRef<any>(null);

  // Initialize animated values for each habit
  habits.forEach((h) => {
    if (!rowOffsets[h.id]) {
      rowOffsets[h.id] = new Animated.Value(0);
    }
  });

  const resetAllRowOffsets = () => {
    Object.keys(rowOffsets).forEach((key) => {
      rowOffsets[key].setValue(0);
    });
  };

  const startDrag = (index: number) => {
    if (habitsRef.current.length <= 1) return;
    isDraggingRef.current = true;
    activeIndexRef.current = index;
    targetIndexRef.current = index;
    setActiveDragIndex(index);
    onDragStateChange?.(true);

    Animated.spring(dragScale, {
      toValue: 1.03,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleDragMove = (dy: number) => {
    if (!isDraggingRef.current || activeIndexRef.current === null) return;
    dragTranslateY.setValue(dy);

    const startIndex = activeIndexRef.current;
    const currentList = habitsRef.current;
    const rHeight = rowHeightRef.current;

    const diff = Math.round(dy / rHeight);
    const newTarget = Math.max(0, Math.min(currentList.length - 1, startIndex + diff));

    if (newTarget !== targetIndexRef.current) {
      targetIndexRef.current = newTarget;

      // Animate other items to make space
      currentList.forEach((habit, i) => {
        if (i === startIndex) return;
        const anim = rowOffsets[habit.id];
        if (!anim) return;

        let toVal = 0;
        if (startIndex < newTarget) {
          // Dragging downwards: items between startIndex + 1 and newTarget shift UP
          if (i > startIndex && i <= newTarget) {
            toVal = -rHeight;
          }
        } else if (startIndex > newTarget) {
          // Dragging upwards: items between newTarget and startIndex - 1 shift DOWN
          if (i < startIndex && i >= newTarget) {
            toVal = rHeight;
          }
        }

        Animated.spring(anim, {
          toValue: toVal,
          useNativeDriver: true,
          tension: 80,
          friction: 9,
        }).start();
      });
    }
  };

  const endDrag = () => {
    if (!isDraggingRef.current || activeIndexRef.current === null) {
      isDraggingRef.current = false;
      activeIndexRef.current = null;
      targetIndexRef.current = null;
      setActiveDragIndex(null);
      onDragStateChange?.(false);
      return;
    }

    const startIndex = activeIndexRef.current;
    const targetIndex = targetIndexRef.current ?? startIndex;
    const currentList = [...habitsRef.current];
    const rHeight = rowHeightRef.current;

    const finalOffset = (targetIndex - startIndex) * rHeight;

    // Smoothly snap dragged card to final destination
    Animated.parallel([
      Animated.spring(dragTranslateY, {
        toValue: finalOffset,
        useNativeDriver: true,
        tension: 80,
        friction: 9,
      }),
      Animated.spring(dragScale, {
        toValue: 1.0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start(() => {
      // Reorder items in state & storage
      if (targetIndex !== startIndex && startIndex >= 0 && targetIndex >= 0) {
        const [moved] = currentList.splice(startIndex, 1);
        currentList.splice(targetIndex, 0, moved);
        onReorder(currentList);
      }

      // Cleanup
      dragTranslateY.setValue(0);
      resetAllRowOffsets();
      isDraggingRef.current = false;
      activeIndexRef.current = null;
      targetIndexRef.current = null;
      setActiveDragIndex(null);
      onDragStateChange?.(false);
    });
  };

  const cancelDrag = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (!isDraggingRef.current) return;

    Animated.parallel([
      Animated.spring(dragTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 90,
        friction: 8,
      }),
      Animated.spring(dragScale, {
        toValue: 1.0,
        useNativeDriver: true,
      }),
    ]).start(() => {
      resetAllRowOffsets();
      isDraggingRef.current = false;
      activeIndexRef.current = null;
      targetIndexRef.current = null;
      setActiveDragIndex(null);
      onDragStateChange?.(false);
    });
  };

  // Create a PanResponder for each row that supports:
  // 1. Quick tap -> toggles habit completion
  // 2. Press & hold (220ms) -> initiates drag
  // 3. Moving finger while holding -> drags row up or down smoothly
  // 4. Touching dedicated handle -> immediate drag
  const createRowPanResponder = (index: number, habit: Habit) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => isDraggingRef.current,
      onPanResponderTerminationRequest: () => !isDraggingRef.current,

      onPanResponderGrant: () => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
        }

        // Start 220ms hold timer to trigger drag mode
        holdTimerRef.current = setTimeout(() => {
          startDrag(index);
        }, 220);
      },

      onPanResponderMove: (evt, gestureState) => {
        if (!isDraggingRef.current) {
          // If finger moved noticeably before hold timer fired, it's a scroll gesture
          if (Math.abs(gestureState.dx) > 7 || Math.abs(gestureState.dy) > 7) {
            if (holdTimerRef.current) {
              clearTimeout(holdTimerRef.current);
              holdTimerRef.current = null;
            }
          }
        } else {
          handleDragMove(gestureState.dy);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (holdTimerRef.current) {
          clearTimeout(holdTimerRef.current);
          holdTimerRef.current = null;
        }

        if (!isDraggingRef.current) {
          // Touch released quickly without holding -> it's a clean tap!
          if (Math.abs(gestureState.dx) < 8 && Math.abs(gestureState.dy) < 8) {
            onToggleHabit(habit.id, selectedDateStr);
          }
        } else {
          endDrag();
        }
      },

      onPanResponderTerminate: () => {
        cancelDrag();
      },
    });
  };

  // Dedicated PanResponder for the grip handle (starts drag immediately without 220ms delay)
  const createHandlePanResponder = (index: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startDrag(index);
      },
      onPanResponderMove: (evt, gestureState) => {
        handleDragMove(gestureState.dy);
      },
      onPanResponderRelease: () => {
        endDrag();
      },
      onPanResponderTerminate: () => {
        cancelDrag();
      },
    });
  };

  return (
    <View style={styles.container}>
      {habits.length > 1 && (
        <View style={styles.hintBar}>
          <Ionicons name="swap-vertical-outline" size={13} color={theme.textTertiary} />
          <Text style={[styles.hintText, { color: theme.textTertiary }]}>
            Hold & drag to reorder
          </Text>
        </View>
      )}

      {habits.map((item, index) => {
        const isDragging = activeDragIndex === index;
        const isCompleted = (item.completedDates || []).includes(selectedDateStr);
        const cardBg = isDarkMode ? '#161618' : '#FFFFFF';
        const iconColor = item.color || '#3858D6';

        const rowPanResponder = createRowPanResponder(index, item);
        const handlePanResponder = createHandlePanResponder(index);

        const animatedStyle = isDragging
          ? {
              transform: [{ translateY: dragTranslateY }, { scale: dragScale }],
              zIndex: 9999,
              elevation: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDarkMode ? 0.45 : 0.22,
              shadowRadius: 12,
              borderColor: '#E05368',
              borderWidth: 1.5,
            }
          : {
              transform: [{ translateY: rowOffsets[item.id] || 0 }],
              zIndex: 1,
            };

        return (
          <Animated.View
            key={item.id}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0 && Math.abs(h + 8 - rowHeight) > 3) {
                setRowHeight(h + 8);
              }
            }}
            style={[styles.rowWrapper, animatedStyle]}
            {...rowPanResponder.panHandlers}
          >
            <View
              style={[
                styles.thinStrip,
                {
                  backgroundColor: isDragging ? (isDarkMode ? '#222328' : '#FFFFFF') : cardBg,
                  borderColor: isDragging
                    ? '#E05368'
                    : isCompleted
                    ? 'rgba(48, 209, 88, 0.35)'
                    : theme.border,
                },
                isCompleted && !isDragging && styles.thinStripCompleted,
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
                  name={(item.icon as any) || 'bicycle-outline'}
                  size={18}
                  color={isCompleted ? '#30D158' : iconColor}
                />
              </View>

              {/* Task Title */}
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

              {/* Delete Icon Button */}
              <TouchableOpacity
                onPress={() => onDeleteHabit(item)}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                style={styles.deleteButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={theme.textTertiary}
                />
              </TouchableOpacity>

              {/* Circular Completion Button */}
              <TouchableOpacity
                onPress={() => onToggleHabit(item.id, selectedDateStr)}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
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
              </TouchableOpacity>

              {/* Grip Handle for Reordering */}
              {habits.length > 1 && (
                <View
                  style={styles.dragHandle}
                  {...handlePanResponder.panHandlers}
                >
                  <Ionicons
                    name="reorder-three-outline"
                    size={22}
                    color={isDragging ? '#E05368' : theme.textTertiary}
                  />
                </View>
              )}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 11.5,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  rowWrapper: {
    marginBottom: 8,
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
    marginRight: 10,
  },
  stripTitleWrapper: {
    flex: 1,
    marginRight: 8,
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
  deleteButton: {
    padding: 6,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  checkCircleActive: {},
  checkCircleInactive: {
    borderWidth: 1.5,
  },
  dragHandle: {
    paddingLeft: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
