import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function NewServiceScreen() {
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const isEditing = !!serviceId;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<{ title?: string; duration?: string; price?: string }>({});

  // Load existing service if editing
  const { data: servicesData } = useQuery({
    queryKey: queryKeys.services,
    queryFn: () => api.getServices(),
    enabled: isEditing,
  });

  useEffect(() => {
    if (isEditing && servicesData?.services) {
      const service = servicesData.services.find((s) => s.id === serviceId);
      if (service) {
        setTitle(service.title);
        setDuration(service.duration.toString());
        setPrice(service.price.toString());
      }
    }
  }, [isEditing, serviceId, servicesData]);

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.createService>[0]) => api.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
      router.back();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.updateService>[1]) =>
      api.updateService(serviceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
      router.back();
    },
  });

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!duration || parseInt(duration) < 5)
      newErrors.duration = 'Duration must be at least 5 minutes';
    if (!price || parseFloat(price) < 0) newErrors.price = 'Enter a valid price';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const data = {
      title: title.trim(),
      duration: parseInt(duration),
      price: parseFloat(price),
      currency: 'INR',
      isActive: true,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-900">
          {isEditing ? 'Edit Service' : 'New Service'}
        </Text>
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
            label="Service Name"
            placeholder="e.g., 1 Hour Session"
            autoCapitalize="words"
            value={title}
            onChangeText={setTitle}
            error={errors.title}
            leftIcon="briefcase-outline"
          />

          <Input
            label="Duration (minutes)"
            placeholder="60"
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
            error={errors.duration}
            leftIcon="time-outline"
            hint="How long does this service take?"
          />

          <Input
            label="Price (INR)"
            placeholder="500"
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
            error={errors.price}
            leftIcon="cash-outline"
          />

          <Button
            title={isEditing ? 'Update Service' : 'Add Service'}
            onPress={handleSubmit}
            loading={isPending}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
