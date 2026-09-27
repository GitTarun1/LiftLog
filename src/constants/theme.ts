import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    background: '#F2F2F7',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    border: '#E5E5EA',
    separator: '#C6C6C8',
    tint: '#007AFF', // iOS System Blue
    tintAccent: '#34C759', // iOS System Green
    tintFlame: '#FF3B30', // iOS System Red/Orange
    tintWarning: '#FF9500',
    tintPurple: '#AF52DE',
    tabBar: 'rgba(255, 255, 255, 0.92)',
    tabBarBorder: '#E5E5EA',
    tabActive: '#007AFF',
    tabInactive: '#8E8E93',
    badge: '#E5E5EA',
    inputBackground: '#E9E9EB',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textTertiary: '#48484A',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    card: '#1C1C1E',
    cardElevated: '#2C2C2E',
    border: '#2C2C2E',
    separator: '#38383A',
    tint: '#0A84FF', // iOS System Blue Dark
    tintAccent: '#30D158', // iOS System Green Dark
    tintFlame: '#FF453A', // iOS System Red Dark
    tintWarning: '#FF9F0A',
    tintPurple: '#BF5AF2',
    tabBar: 'rgba(28, 28, 30, 0.94)',
    tabBarBorder: '#2C2C2E',
    tabActive: '#0A84FF',
    tabInactive: '#8E8E93',
    badge: '#2C2C2E',
    inputBackground: '#2C2C2E',
  },
} as const;

export type ThemeColors = typeof Colors.light;
export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  round: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
