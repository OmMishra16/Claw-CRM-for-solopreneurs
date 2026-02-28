import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { PressableCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/EmptyState';
import { Client } from '@/types';

function ClientCard({ client, onPress }: { client: Client; onPress: () => void }) {
  return (
    <PressableCard variant="elevated" className="mb-3 mx-5" onPress={onPress}>
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center mr-3">
          <Text className="text-lg font-semibold text-indigo-600">
            {client.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-slate-900">{client.name}</Text>
          <Text className="text-sm text-slate-500">{client.phone}</Text>
          {client.appointmentCount !== undefined && client.appointmentCount > 0 && (
            <Text className="text-xs text-slate-400 mt-0.5">
              {client.appointmentCount} appointment{client.appointmentCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </View>
    </PressableCard>
  );
}

export default function ClientsScreen() {
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [...queryKeys.clients, search],
    queryFn: () => api.getClients(search || undefined),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const filteredClients = data?.clients || [];

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-slate-100">
        <View className="mb-3">
          <Text className="text-2xl font-bold text-slate-900">Clients</Text>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-slate-100 rounded-xl px-4 py-2.5">
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-2 text-base text-slate-900"
            placeholder="Search clients..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={search ? 'No clients found' : 'No clients yet'}
          description={search ? 'Try a different search term' : 'Add your first client to get started'}
          actionLabel={search ? undefined : 'Add Client'}
          onAction={search ? undefined : () => router.push('/new-client')}
        />
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              onPress={() => router.push(`/(tabs)/clients/${item.id}`)}
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
        onPress={() => router.push('/new-client')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
