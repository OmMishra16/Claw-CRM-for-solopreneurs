import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function NewClientScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.createClient>[0]) => api.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      router.back();
    },
  });

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!phone.trim()) newErrors.phone = 'Phone is required';
    else if (phone.replace(/\D/g, '').length < 10)
      newErrors.phone = 'Enter a valid phone number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-900">New Client</Text>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Input
            label="Client Name"
            placeholder="e.g., Priya Patel"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
            error={errors.name}
            leftIcon="person-outline"
          />

          <Input
            label="Phone Number"
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            error={errors.phone}
            leftIcon="call-outline"
          />

          <Input
            label="Email (Optional)"
            placeholder="client@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            leftIcon="mail-outline"
          />

          <View className="mb-4">
            <Text className="text-sm font-medium text-slate-700 mb-1.5">
              Private Notes (Optional)
            </Text>
            <View className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <Input
                placeholder="Add notes about this client..."
                multiline
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
                style={{ height: 100, textAlignVertical: 'top' }}
              />
            </View>
          </View>

          <Button
            title="Add Client"
            onPress={handleSubmit}
            loading={createMutation.isPending}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
