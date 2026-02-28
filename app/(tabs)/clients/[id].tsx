import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Card, PressableCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.clientDetail(id!),
    queryFn: () => api.getClient(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteClient(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
      router.back();
    },
  });

  const handleCall = () => {
    if (data?.client.phone) {
      Linking.openURL(`tel:${data.client.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (data?.client.phone) {
      const phone = data.client.phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Client',
      'Are you sure you want to delete this client? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  const client = data?.client;
  if (!client) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-slate-500">Client not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-4 bg-white border-b border-slate-100">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3"
          >
            <Ionicons name="arrow-back" size={20} color="#64748B" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900 flex-1">Client Details</Text>
          <TouchableOpacity onPress={handleDelete} className="p-2">
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Client Info */}
        <Card variant="elevated" className="mb-4">
          <View className="items-center mb-4">
            <View className="w-20 h-20 rounded-full bg-indigo-100 items-center justify-center mb-3">
              <Text className="text-3xl font-bold text-indigo-600">
                {client.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-xl font-bold text-slate-900">{client.name}</Text>
            {client.email && (
              <Text className="text-sm text-slate-500">{client.email}</Text>
            )}
          </View>

          {/* Contact Actions */}
          <View className="flex-row mb-4">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-3 bg-slate-100 rounded-xl mr-2"
              onPress={handleCall}
            >
              <Ionicons name="call" size={18} color="#6366F1" />
              <Text className="text-sm font-medium text-indigo-600 ml-2">Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-3 bg-emerald-100 rounded-xl ml-2"
              onPress={handleWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
              <Text className="text-sm font-medium text-emerald-600 ml-2">WhatsApp</Text>
            </TouchableOpacity>
          </View>

          <View className="border-t border-slate-100 pt-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="call-outline" size={18} color="#64748B" />
              <Text className="text-base text-slate-700 ml-3">{client.phone}</Text>
            </View>
            {client.email && (
              <View className="flex-row items-center">
                <Ionicons name="mail-outline" size={18} color="#64748B" />
                <Text className="text-base text-slate-700 ml-3">{client.email}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Notes */}
        {client.notes && (
          <Card variant="elevated" className="mb-4">
            <Text className="text-sm font-medium text-slate-500 mb-2">Private Notes</Text>
            <Text className="text-base text-slate-700">{client.notes}</Text>
          </Card>
        )}

        {/* Stats */}
        <Card variant="elevated" className="mb-4">
          <View className="flex-row">
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-slate-900">
                {client.appointments?.length || 0}
              </Text>
              <Text className="text-sm text-slate-500">Appointments</Text>
            </View>
            <View className="w-px bg-slate-200" />
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-indigo-600">
                ₹{client.totalRevenue?.toLocaleString() || '0'}
              </Text>
              <Text className="text-sm text-slate-500">Total Revenue</Text>
            </View>
          </View>
        </Card>

        {/* Appointment History */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-slate-900 mb-3">Appointment History</Text>
          {!client.appointments?.length ? (
            <Card variant="outlined" className="items-center py-6">
              <Text className="text-slate-500">No appointments yet</Text>
            </Card>
          ) : (
            client.appointments.map((apt) => (
              <Card key={apt.id} variant="outlined" className="mb-2">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-sm text-slate-900 font-medium">
                      {apt.service?.title || 'Service'}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {new Date(apt.dateTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-sm text-indigo-600 font-medium mr-2">
                      ₹{apt.service?.price || 0}
                    </Text>
                    <View
                      className={`w-5 h-5 rounded-full items-center justify-center ${
                        apt.status === 'completed' ? 'bg-emerald-100' : 'bg-slate-100'
                      }`}
                    >
                      <Ionicons
                        name={apt.status === 'completed' ? 'checkmark' : 'time-outline'}
                        size={12}
                        color={apt.status === 'completed' ? '#10B981' : '#94A3B8'}
                      />
                    </View>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Book New Appointment */}
        <Button
          title="Book New Appointment"
          fullWidth
          onPress={() => router.push({ pathname: '/new-appointment', params: { clientId: client.id } })}
          icon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
