import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/context/AuthContext';
import { Card, PressableCard } from '@/components/ui/Card';

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingsItem({ icon, title, subtitle, onPress, danger }: SettingsItemProps) {
  return (
    <PressableCard
      variant="default"
      padding="md"
      className="mb-1"
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="flex-row items-center">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            danger ? 'bg-red-100' : 'bg-slate-100'
          }`}
        >
          <Ionicons name={icon} size={20} color={danger ? '#EF4444' : '#64748B'} />
        </View>
        <View className="flex-1">
          <Text className={`text-base font-medium ${danger ? 'text-red-600' : 'text-slate-900'}`}>
            {title}
          </Text>
          {subtitle && <Text className="text-sm text-slate-500">{subtitle}</Text>}
        </View>
        {onPress && <Ionicons name="chevron-forward" size={20} color="#94A3B8" />}
      </View>
    </PressableCard>
  );
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4 bg-white border-b border-slate-100">
        <Text className="text-2xl font-bold text-slate-900">Settings</Text>
      </View>

      <View className="flex-1 p-5">
        {/* Profile Section */}
        <Card variant="elevated" className="mb-6">
          <View className="flex-row items-center">
            <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center mr-4">
              <Text className="text-2xl font-bold text-indigo-600">
                {user?.businessName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-slate-900">
                {user?.businessName || 'Your Business'}
              </Text>
              <Text className="text-sm text-slate-500">{user?.email}</Text>
              {user?.phone && (
                <Text className="text-sm text-slate-400">{user.phone}</Text>
              )}
            </View>
          </View>
        </Card>

        {/* Settings Items */}
        <Text className="text-sm font-medium text-slate-500 mb-2 px-1">ACCOUNT</Text>
        <View className="bg-white rounded-2xl overflow-hidden mb-6">
          <SettingsItem
            icon="person-outline"
            title="Edit Profile"
            subtitle="Update your business info"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/edit-profile');
            }}
          />
          <SettingsItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notification-settings');
            }}
          />
        </View>

        <Text className="text-sm font-medium text-slate-500 mb-2 px-1">SUPPORT</Text>
        <View className="bg-white rounded-2xl overflow-hidden mb-6">
          <SettingsItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help with using Claw"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/help-support');
            }}
          />
          <SettingsItem
            icon="document-text-outline"
            title="Terms & Privacy"
            subtitle="Read our policies"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/terms-privacy');
            }}
          />
        </View>

        <Text className="text-sm font-medium text-slate-500 mb-2 px-1">DANGER ZONE</Text>
        <View className="bg-white rounded-2xl overflow-hidden">
          <SettingsItem
            icon="log-out-outline"
            title="Log Out"
            onPress={handleLogout}
            danger
          />
        </View>

        {/* Version */}
        <View className="items-center mt-auto pt-6">
          <Text className="text-sm text-slate-400">Claw v1.0.0</Text>
          <Text className="text-xs text-slate-300 mt-1">Made with care for solo practitioners</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
