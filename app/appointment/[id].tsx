import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AppointmentStatus } from '@/types';

const statusConfig: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-600', icon: 'time-outline', label: 'Pending' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-600', icon: 'checkmark-circle-outline', label: 'Confirmed' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: 'checkmark-done', label: 'Completed' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', icon: 'close-circle-outline', label: 'Cancelled' },
};

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showActions, setShowActions] = useState(false);

  const { data: appointmentsData } = useQuery({
    queryKey: queryKeys.appointments,
    queryFn: () => api.getAppointments(),
  });

  const { data: todayData } = useQuery({
    queryKey: queryKeys.todayAppointments,
    queryFn: () => api.getTodayAppointments(),
  });

  // Find appointment from either query
  const appointment =
    todayData?.appointments?.find(a => a.id === id) ||
    appointmentsData?.appointments?.find(a => a.id === id);

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: AppointmentStatus }) =>
      api.updateAppointmentStatus(id!, status),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.todayAppointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAppointment(id!),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.todayAppointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      router.back();
    },
  });

  const handleStatusChange = async (status: AppointmentStatus) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    statusMutation.mutate({ status });
    setShowActions(false);
  };

  const handleCall = () => {
    if (appointment?.client?.phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(`tel:${appointment.client.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (appointment?.client?.phone) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const phone = appointment.client.phone.replace(/\D/g, '');
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  if (!appointment) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-slate-500">Loading appointment...</Text>
      </SafeAreaView>
    );
  }

  const status = statusConfig[appointment.status] || statusConfig.pending;
  const dateTime = new Date(appointment.dateTime);
  const endTime = new Date(appointment.endTime);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const isCompleted = appointment.status === 'completed';
  const isCancelled = appointment.status === 'cancelled';
  const canModify = !isCompleted && !isCancelled;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 bg-white border-b border-slate-100">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="chevron-back" size={24} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-900">Appointment</Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowActions(!showActions);
          }}
          className="w-10 h-10 items-center justify-center -mr-2"
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Status Badge */}
        <View className="items-center mb-6">
          <View className={`flex-row items-center px-4 py-2 rounded-full ${status.bg}`}>
            <Ionicons name={status.icon as any} size={18} color={status.text.includes('amber') ? '#D97706' : status.text.includes('blue') ? '#2563EB' : status.text.includes('emerald') ? '#059669' : '#64748B'} />
            <Text className={`ml-2 font-semibold ${status.text}`}>{status.label}</Text>
          </View>
        </View>

        {/* Client Card */}
        <Card variant="elevated" className="mb-4">
          <View className="flex-row items-center">
            <View className="w-14 h-14 rounded-full bg-indigo-100 items-center justify-center mr-4">
              <Text className="text-xl font-bold text-indigo-600">
                {appointment.client?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-slate-900">
                {appointment.client?.name || 'Unknown Client'}
              </Text>
              <Text className="text-sm text-slate-500">{appointment.client?.phone}</Text>
            </View>
          </View>

          {/* Quick Contact Actions */}
          {appointment.client?.phone && (
            <View className="flex-row mt-4 pt-4 border-t border-slate-100">
              <TouchableOpacity
                onPress={handleCall}
                className="flex-1 flex-row items-center justify-center py-2 mr-2 bg-emerald-50 rounded-xl"
              >
                <Ionicons name="call" size={18} color="#059669" />
                <Text className="ml-2 font-medium text-emerald-600">Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleWhatsApp}
                className="flex-1 flex-row items-center justify-center py-2 ml-2 bg-green-50 rounded-xl"
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                <Text className="ml-2 font-medium text-green-600">WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Date & Time */}
        <Card variant="elevated" className="mb-4">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3">
              <Ionicons name="calendar" size={20} color="#6366F1" />
            </View>
            <View>
              <Text className="text-base font-medium text-slate-900">{formatDate(dateTime)}</Text>
              <Text className="text-sm text-slate-500">
                {formatTime(dateTime)} - {formatTime(endTime)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Service & Price */}
        <Card variant="elevated" className="mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3">
                <Ionicons name="briefcase" size={20} color="#6366F1" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-slate-900">
                  {appointment.service?.title || 'No service'}
                </Text>
                <Text className="text-sm text-slate-500">
                  {appointment.service?.duration} minutes
                </Text>
              </View>
            </View>
            <View className="bg-indigo-50 px-4 py-2 rounded-xl">
              <Text className="text-xl font-bold text-indigo-600">
                ₹{appointment.service?.price?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Notes */}
        {appointment.notes && (
          <Card variant="outlined" className="mb-4">
            <Text className="text-sm font-medium text-slate-500 mb-2">Notes</Text>
            <Text className="text-base text-slate-900">{appointment.notes}</Text>
          </Card>
        )}

        {/* Action Buttons */}
        {canModify && (
          <View className="mt-2">
            <Button
              title="Mark as Completed"
              onPress={() => handleStatusChange('completed')}
              loading={statusMutation.isPending}
              fullWidth
              size="lg"
              icon="checkmark-circle"
            />

            <View className="flex-row mt-3">
              <TouchableOpacity
                onPress={() => handleStatusChange('cancelled')}
                className="flex-1 flex-row items-center justify-center py-3.5 mr-2 bg-slate-100 rounded-xl"
              >
                <Ionicons name="close-circle-outline" size={20} color="#64748B" />
                <Text className="ml-2 font-semibold text-slate-600">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/new-appointment',
                    params: {
                      rescheduleId: id,
                      clientId: appointment.client?.id,
                      serviceId: appointment.service?.id,
                    },
                  });
                }}
                className="flex-1 flex-row items-center justify-center py-3.5 ml-2 bg-amber-50 rounded-xl"
              >
                <Ionicons name="calendar-outline" size={20} color="#D97706" />
                <Text className="ml-2 font-semibold text-amber-600">Reschedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Completed/Cancelled State */}
        {(isCompleted || isCancelled) && (
          <View className="mt-2">
            <Card variant="outlined" className="items-center py-6">
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'close-circle'}
                size={48}
                color={isCompleted ? '#059669' : '#64748B'}
              />
              <Text className={`mt-2 text-lg font-semibold ${isCompleted ? 'text-emerald-600' : 'text-slate-500'}`}>
                {isCompleted ? 'Appointment Completed' : 'Appointment Cancelled'}
              </Text>
              {isCompleted && appointment.service?.price && (
                <Text className="text-sm text-slate-500 mt-1">
                  Revenue: ₹{appointment.service.price.toLocaleString()}
                </Text>
              )}
            </Card>

            {isCancelled && (
              <Button
                title="Rebook This Appointment"
                variant="outline"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/new-appointment',
                    params: {
                      clientId: appointment.client?.id,
                      serviceId: appointment.service?.id,
                    },
                  });
                }}
                fullWidth
                size="lg"
                className="mt-4"
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Actions Sheet */}
      {showActions && (
        <TouchableOpacity
          className="absolute inset-0 bg-black/30"
          activeOpacity={1}
          onPress={() => setShowActions(false)}
        >
          <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 pb-10">
            <View className="w-10 h-1 bg-slate-200 rounded-full self-center mb-5" />

            {canModify && (
              <>
                <TouchableOpacity
                  onPress={() => handleStatusChange('completed')}
                  className="flex-row items-center py-4 border-b border-slate-100"
                >
                  <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mr-4">
                    <Ionicons name="checkmark-circle" size={22} color="#059669" />
                  </View>
                  <Text className="text-base font-medium text-slate-900">Mark as Completed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleStatusChange('confirmed')}
                  className="flex-row items-center py-4 border-b border-slate-100"
                >
                  <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-4">
                    <Ionicons name="checkmark" size={22} color="#2563EB" />
                  </View>
                  <Text className="text-base font-medium text-slate-900">Confirm Appointment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleStatusChange('cancelled')}
                  className="flex-row items-center py-4 border-b border-slate-100"
                >
                  <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-4">
                    <Ionicons name="close-circle" size={22} color="#64748B" />
                  </View>
                  <Text className="text-base font-medium text-slate-900">Cancel Appointment</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              onPress={() => {
                setShowActions(false);
                deleteMutation.mutate();
              }}
              className="flex-row items-center py-4"
            >
              <View className="w-10 h-10 rounded-full bg-red-100 items-center justify-center mr-4">
                <Ionicons name="trash" size={22} color="#EF4444" />
              </View>
              <Text className="text-base font-medium text-red-500">Delete Appointment</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
