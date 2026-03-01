import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { generateReminderMessage, getWhatsAppUrl, cancelAppointmentReminder } from '@/lib/notifications';
import { AppointmentStatus } from '@/types';

export default function AppointmentReminderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: todayData } = useQuery({
    queryKey: queryKeys.todayAppointments,
    queryFn: () => api.getTodayAppointments(),
  });

  const { data: appointmentsData } = useQuery({
    queryKey: queryKeys.appointments,
    queryFn: () => api.getAppointments(),
  });

  // Find appointment from either query
  const appointment =
    todayData?.appointments?.find(a => a.id === id) ||
    appointmentsData?.appointments?.find(a => a.id === id);

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: AppointmentStatus }) =>
      api.updateAppointmentStatus(id!, status),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await cancelAppointmentReminder(id!);
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.todayAppointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      router.back();
    },
  });

  const handleSendReminder = async () => {
    if (!appointment?.client?.phone) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const time = new Date(appointment.dateTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const message = generateReminderMessage(
      appointment.client.name,
      appointment.service?.title || 'appointment',
      time,
      user?.businessName || 'Your practitioner'
    );

    const url = getWhatsAppUrl(appointment.client.phone, message);
    await Linking.openURL(url);
  };

  const handleCall = async () => {
    if (!appointment?.client?.phone) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Linking.openURL(`tel:${appointment.client.phone}`);
  };

  const handleConfirm = () => {
    statusMutation.mutate({ status: 'confirmed' });
  };

  if (!appointment) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Loading...</Text>
      </SafeAreaView>
    );
  }

  const dateTime = new Date(appointment.dateTime);
  const endTime = new Date(appointment.endTime);
  const now = new Date();
  const minutesUntil = Math.round((dateTime.getTime() - now.getTime()) / (1000 * 60));

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const getTimeUntilText = () => {
    if (minutesUntil <= 0) return 'Starting now';
    if (minutesUntil < 60) return `in ${minutesUntil} minutes`;
    const hours = Math.floor(minutesUntil / 60);
    const mins = minutesUntil % 60;
    if (mins === 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    return `in ${hours}h ${mins}m`;
  };

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
        <Text className="text-lg font-semibold text-slate-900">Reminder</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 px-5 pt-6">
        {/* Upcoming Badge */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-indigo-100 items-center justify-center mb-4">
            <Ionicons name="notifications" size={40} color="#6366F1" />
          </View>
          <Text className="text-2xl font-bold text-slate-900 mb-1">Upcoming</Text>
          <View className="flex-row items-center bg-amber-100 px-4 py-2 rounded-full">
            <Ionicons name="time" size={18} color="#D97706" />
            <Text className="text-amber-700 font-semibold ml-2">{getTimeUntilText()}</Text>
          </View>
        </View>

        {/* Appointment Details Card */}
        <Card variant="elevated" className="mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-14 h-14 rounded-full bg-indigo-100 items-center justify-center mr-4">
              <Text className="text-xl font-bold text-indigo-600">
                {appointment.client?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-slate-900">
                {appointment.client?.name || 'Unknown Client'}
              </Text>
              <Text className="text-base text-slate-500">{appointment.client?.phone}</Text>
            </View>
          </View>

          <View className="bg-slate-50 rounded-xl p-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="briefcase-outline" size={18} color="#64748B" />
              <Text className="text-base text-slate-700 ml-3 flex-1">
                {appointment.service?.title || 'No service'}
              </Text>
            </View>
            <View className="flex-row items-center mb-3">
              <Ionicons name="time-outline" size={18} color="#64748B" />
              <Text className="text-base text-slate-700 ml-3">
                {formatTime(dateTime)} - {formatTime(endTime)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="cash-outline" size={18} color="#64748B" />
              <Text className="text-base font-semibold text-indigo-600 ml-3">
                ₹{appointment.service?.price?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View className="space-y-3">
          {/* Primary Action - Send WhatsApp Reminder */}
          <TouchableOpacity
            onPress={handleSendReminder}
            className="flex-row items-center justify-center bg-green-500 rounded-2xl py-4 px-6 shadow-lg shadow-green-200 mb-3"
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
            <Text className="text-white text-lg font-bold ml-3">Send WhatsApp Reminder</Text>
          </TouchableOpacity>

          {/* Secondary Actions */}
          <View className="flex-row mb-3">
            <TouchableOpacity
              onPress={handleCall}
              className="flex-1 flex-row items-center justify-center bg-white border border-slate-200 rounded-xl py-3.5 mr-2"
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={20} color="#059669" />
              <Text className="text-slate-700 font-semibold ml-2">Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              className="flex-1 flex-row items-center justify-center bg-white border border-slate-200 rounded-xl py-3.5 ml-2"
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
              <Text className="text-slate-700 font-semibold ml-2">Confirm</Text>
            </TouchableOpacity>
          </View>

          {/* View Full Details */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.replace(`/appointment/${id}`);
            }}
            className="flex-row items-center justify-center py-3"
            activeOpacity={0.7}
          >
            <Text className="text-indigo-600 font-medium">View Full Details</Text>
            <Ionicons name="arrow-forward" size={16} color="#6366F1" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
