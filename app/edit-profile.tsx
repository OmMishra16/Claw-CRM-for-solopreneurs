import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const updateMutation = useMutation({
    mutationFn: (data: { businessName?: string; phone?: string }) => api.updateProfile(data),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshUser();
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to update profile');
    },
  });

  const handleSave = () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    updateMutation.mutate({
      businessName: businessName.trim(),
      phone: phone.trim() || undefined,
    });
  };

  const hasChanges = businessName !== (user?.businessName || '') || phone !== (user?.phone || '');

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
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
          <Text className="text-lg font-semibold text-slate-900">Edit Profile</Text>
          <View className="w-6" />
        </View>

        <View className="flex-1 p-5">
          {/* Avatar */}
          <View className="items-center mb-8">
            <View className="w-24 h-24 rounded-full bg-indigo-100 items-center justify-center mb-3">
              <Text className="text-4xl font-bold text-indigo-600">
                {businessName.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <Text className="text-sm text-slate-500">{user?.email}</Text>
          </View>

          {/* Form */}
          <Input
            label="Business Name"
            placeholder="Enter your business name"
            value={businessName}
            onChangeText={setBusinessName}
            leftIcon="business-outline"
            autoCapitalize="words"
          />

          <Input
            label="Phone Number"
            placeholder="Enter your phone number"
            value={phone}
            onChangeText={setPhone}
            leftIcon="call-outline"
            keyboardType="phone-pad"
          />

          <View className="bg-slate-50 rounded-xl p-4 mt-2">
            <View className="flex-row items-center">
              <Ionicons name="information-circle" size={18} color="#64748B" />
              <Text className="text-sm text-slate-500 ml-2 flex-1">
                Your email address cannot be changed. Contact support if you need help.
              </Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <View className="p-5 border-t border-slate-100">
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={updateMutation.isPending}
            disabled={!hasChanges}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
