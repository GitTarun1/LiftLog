import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FitnessProvider } from '@/context/FitnessContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FitnessProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="exercise/[id]" options={{ headerShown: false }} />
        </Stack>
      </FitnessProvider>
    </SafeAreaProvider>
  );
}