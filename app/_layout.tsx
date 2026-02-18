import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/context/AuthContext';
import {
  requestNotificationPermissions,
  setupNotificationResponseHandler,
  setupNotificationReceivedHandler,
} from '@/lib/notifications';
import './global.css';

export default function RootLayout() {
  // Initialize notifications on app start
  useEffect(() => {
    const initNotifications = async () => {
      await requestNotificationPermissions();
    };

    initNotifications();

    // Set up notification handlers
    const responseSubscription = setupNotificationResponseHandler();
    const receivedSubscription = setupNotificationReceivedHandler();

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FFFFFF' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="appointment/[id]"
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="appointment-reminder/[id]"
              options={{
                animation: 'slide_from_bottom',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="new-appointment"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="new-client"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="new-service"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="appointments"
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="edit-profile"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="notification-settings"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="help-support"
              options={{
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="terms-privacy"
              options={{
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
