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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Invalid email address');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await api.forgotPassword(email.trim().toLowerCase());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to reset password screen with email
      router.push({
        pathname: '/(auth)/reset-password',
        params: { email: email.trim().toLowerCase() },
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
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
              <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center mb-4">
                <Ionicons name="lock-open-outline" size={32} color="#6366F1" />
              </View>
              <Text className="text-2xl font-bold text-slate-900 mb-2">
                Forgot Password?
              </Text>
              <Text className="text-base text-slate-500 leading-6">
                No worries! Enter your email address and we&apos;ll send you a code to reset your password.
              </Text>
            </View>

            {/* Form */}
            <View className="flex-1">
              <Input
                label="Email Address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
                error={error}
                leftIcon="mail-outline"
              />

              <Button
                title="Send Reset Code"
                onPress={handleSubmit}
                loading={loading}
                fullWidth
                size="lg"
              />
            </View>

            {/* Footer */}
            <View className="flex-row justify-center mt-8">
              <Text className="text-slate-500">Remember your password? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-indigo-500 font-semibold">Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
