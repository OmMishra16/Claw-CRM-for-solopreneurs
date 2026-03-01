import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '@/components/ui/Card';

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

interface NotificationSettings {
  appointmentReminders: boolean;
  reminderTime: number; // minutes before appointment
  dailySummary: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  appointmentReminders: true,
  reminderTime: 60,
  dailySummary: false,
};

const REMINDER_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '1 day', value: 1440 },
];

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const setReminderTime = (minutes: number) => {
    const newSettings = { ...settings, reminderTime: minutes };
    saveSettings(newSettings);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-slate-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-900">Notifications</Text>
        <View className="w-6" />
      </View>

      <View className="flex-1 p-5">
        {/* Appointment Reminders */}
        <Card variant="outlined" className="mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-base font-medium text-slate-900">Appointment Reminders</Text>
              <Text className="text-sm text-slate-500">Get notified before appointments</Text>
            </View>
            <Switch
              value={settings.appointmentReminders}
              onValueChange={() => toggleSetting('appointmentReminders')}
              trackColor={{ false: '#E2E8F0', true: '#818CF8' }}
              thumbColor={settings.appointmentReminders ? '#6366F1' : '#F8FAFC'}
            />
          </View>

          {settings.appointmentReminders && (
            <View>
              <Text className="text-sm font-medium text-slate-700 mb-2">Remind me</Text>
              <View className="flex-row flex-wrap gap-2">
                {REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setReminderTime(option.value)}
                    className={`px-4 py-2 rounded-full ${
                      settings.reminderTime === option.value
                        ? 'bg-indigo-500'
                        : 'bg-slate-100'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        settings.reminderTime === option.value
                          ? 'text-white'
                          : 'text-slate-600'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="text-xs text-slate-400 mt-2">
                Before each appointment
              </Text>
            </View>
          )}
        </Card>

        {/* Daily Summary */}
        <Card variant="outlined" className="mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-medium text-slate-900">Daily Summary</Text>
              <Text className="text-sm text-slate-500">Morning overview of your day</Text>
            </View>
            <Switch
              value={settings.dailySummary}
              onValueChange={() => toggleSetting('dailySummary')}
              trackColor={{ false: '#E2E8F0', true: '#818CF8' }}
              thumbColor={settings.dailySummary ? '#6366F1' : '#F8FAFC'}
            />
          </View>
          {settings.dailySummary && (
            <Text className="text-xs text-slate-400 mt-2">
              Sent at 8:00 AM every day
            </Text>
          )}
        </Card>

        {/* Info */}
        <View className="bg-slate-50 rounded-xl p-4 mt-2">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={18} color="#64748B" />
            <Text className="text-sm text-slate-500 ml-2 flex-1">
              Notifications help you stay on top of your schedule. Make sure to allow notifications in your device settings.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
