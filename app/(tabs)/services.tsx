import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { PressableCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { Service } from '@/types';

function ServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <PressableCard variant="elevated" className="mb-3 mx-5" onPress={onEdit}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900">{service.title}</Text>
          <View className="flex-row items-center mt-1">
            <View className="flex-row items-center mr-4">
              <Ionicons name="time-outline" size={14} color="#64748B" />
              <Text className="text-sm text-slate-500 ml-1">{service.duration} min</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-sm font-semibold text-indigo-600">
                {service.currency === 'INR' ? '₹' : service.currency}
                {service.price.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
        <View className="flex-row items-center">
          {!service.isActive && (
            <View className="bg-slate-100 px-2 py-1 rounded mr-2">
              <Text className="text-xs text-slate-500">Inactive</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={onDelete}
            className="p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </PressableCard>
  );
}

export default function ServicesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.services,
    queryFn: () => api.getServices(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDelete = (service: Service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(service.id),
        },
      ]
    );
  };

  const handleEdit = (service: Service) => {
    router.push({ pathname: '/new-service', params: { serviceId: service.id } });
  };

  const services = data?.services || [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-slate-100">
        <View>
          <Text className="text-2xl font-bold text-slate-900">Services</Text>
          <Text className="text-sm text-slate-500">
            {services.length} service{services.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : services.length === 0 ? (
        <EmptyState
          icon="list-outline"
          title="No services yet"
          description="Create your first service to start booking appointments"
          actionLabel="Add Service"
          onAction={() => router.push('/new-service')}
        />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceCard
              service={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-indigo-500 items-center justify-center shadow-lg shadow-indigo-300"
        onPress={() => router.push('/new-service')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
