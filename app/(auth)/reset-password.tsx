import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    code?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!code.trim()) {
      newErrors.code = 'Reset code is required';
    } else if (code.length !== 6 || !/^\d+$/.test(code)) {
      newErrors.code = 'Code must be 6 digits';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await api.resetPassword(email || '', code.trim(), newPassword);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Password Reset!',
        'Your password has been reset successfully. Please sign in with your new password.',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await api.forgotPassword(email || '');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Code Sent', 'A new reset code has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend code');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="px-6 pt-4"
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <View className="flex-1 px-6 pt-8 pb-8">
            {/* Header */}
            <View className="mb-8">
              <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
                <Ionicons name="shield-checkmark-outline" size={32} color="#059669" />
              </View>
              <Text className="text-2xl font-bold text-slate-900 mb-2">
                Reset Password
              </Text>
              <Text className="text-base text-slate-500 leading-6">
                Enter the 6-digit code sent to{' '}
                <Text className="font-medium text-slate-700">{email}</Text> and create a new password.
              </Text>
            </View>

            {/* Form */}
            <View className="flex-1">
              <Input
                label="Reset Code"
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={(text) => {
                  setCode(text.replace(/\D/g, ''));
                  setErrors((prev) => ({ ...prev, code: undefined }));
                }}
                error={errors.code}
                leftIcon="keypad-outline"
              />

              <Input
                label="New Password"
                placeholder="At least 6 characters"
                secureTextEntry
                autoCapitalize="none"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setErrors((prev) => ({ ...prev, newPassword: undefined }));
                }}
                error={errors.newPassword}
                leftIcon="lock-closed-outline"
              />

              <Input
                label="Confirm Password"
                placeholder="Re-enter your password"
                secureTextEntry
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                error={errors.confirmPassword}
                leftIcon="lock-closed-outline"
              />

              <Button
                title="Reset Password"
                onPress={handleSubmit}
                loading={loading}
                fullWidth
                size="lg"
              />

              {/* Resend Code */}
              <TouchableOpacity
                onPress={handleResendCode}
                className="mt-4 py-2"
              >
                <Text className="text-center text-indigo-500 font-medium">
                  Didn&apos;t receive the code? Resend
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
