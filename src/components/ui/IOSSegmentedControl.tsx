import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface IOSSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selectedValue: T;
  onValueChange: (val: T) => void;
}

export function IOSSegmentedControl<T extends string>({
  options,
  selectedValue,
  onValueChange,
}: IOSSegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.inputBackground }]}>
      {options.map((opt) => {
        const isSelected = opt.value === selectedValue;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.7}
            onPress={() => onValueChange(opt.value)}
            style={[
              styles.segment,
              isSelected && [
                styles.segmentActive,
                { backgroundColor: theme.card, shadowColor: '#000' },
              ],
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? theme.text : theme.textSecondary },
                isSelected && styles.labelActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 3,
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  labelActive: {
    fontWeight: '600',
  },
});
