import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Card } from '@/components/ui/Card';
import { Appointment } from '@/types';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-600', dot: '#F59E0B' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-600', dot: '#3B82F6' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-600', dot: '#10B981' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', dot: '#94A3B8' },
};

type FilterType = 'all' | 'upcoming' | 'past';

export default function AppointmentsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.appointments,
    queryFn: () => api.getAppointments(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const now = new Date();
  const appointments = data?.appointments || [];

  const filteredAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.dateTime);
    if (filter === 'upcoming') return aptDate >= now && apt.status !== 'cancelled';
    if (filter === 'past') return aptDate < now || apt.status === 'completed' || apt.status === 'cancelled';
    return true;
  });

  // Group appointments by date
  const groupedAppointments = filteredAppointments.reduce((groups, apt) => {
    const date = new Date(apt.dateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(apt);
    return groups;
  }, {} as Record<string, Appointment[]>);

  const handleAppointmentPress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/appointment/${id}`);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toDateString() === now.toDateString();
  };

  const isTomorrow = (dateStr: string) => {
    const date = new Date(dateStr);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const getDateLabel = (dateKey: string, firstApt: Appointment) => {
    if (isToday(firstApt.dateTime)) return 'Today';
    if (isTomorrow(firstApt.dateTime)) return 'Tomorrow';
    return dateKey;
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 bg-white border-b border-slate-100">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="chevron-back" size={24} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-900 flex-1 text-center mr-10">All Appointments</Text>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-5 py-3 bg-white border-b border-slate-100">
        {(['all', 'upcoming', 'past'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(f);
            }}
            className={`mr-3 px-4 py-2 rounded-full ${
              filter === f ? 'bg-indigo-500' : 'bg-slate-100'
            }`}
          >
            <Text
              className={`text-sm font-medium capitalize ${
                filter === f ? 'text-white' : 'text-slate-600'
              }`}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#6366F1" />
            <Text className="text-sm text-slate-400 mt-3">Loading appointments...</Text>
          </View>
        ) : filteredAppointments.length === 0 ? (
          <Card variant="outlined" className="items-center py-10">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
              <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
            </View>
            <Text className="text-lg font-semibold text-slate-900 mb-1">No appointments</Text>
            <Text className="text-sm text-slate-500 text-center px-4">
              {filter === 'upcoming'
                ? 'No upcoming appointments scheduled'
                : filter === 'past'
                ? 'No past appointments found'
                : 'No appointments found'}
            </Text>
          </Card>
        ) : (
          Object.entries(groupedAppointments).map(([dateKey, dayAppointments]) => (
            <View key={dateKey} className="mb-6">
              {/* Date Header */}
              <View className="flex-row items-center mb-3">
                <View
                  className={`w-2 h-2 rounded-full mr-2 ${
                    isToday(dayAppointments[0].dateTime) ? 'bg-indigo-500' : 'bg-slate-300'
                  }`}
                />
                <Text
                  className={`text-sm font-semibold ${
                    isToday(dayAppointments[0].dateTime) ? 'text-indigo-600' : 'text-slate-500'
                  }`}
                >
                  {getDateLabel(dateKey, dayAppointments[0])}
                </Text>
                <Text className="text-xs text-slate-400 ml-2">
                  {dayAppointments.length} appointment{dayAppointments.length > 1 ? 's' : ''}
                </Text>
              </View>

              {/* Appointments for this date */}
              {dayAppointments.map((appointment) => {
                const status = statusColors[appointment.status] || statusColors.pending;
                return (
                  <TouchableOpacity
                    key={appointment.id}
                    onPress={() => handleAppointmentPress(appointment.id)}
                    activeOpacity={0.7}
                    className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm mb-2"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <View
                            className="w-2.5 h-2.5 rounded-full mr-2"
                            style={{ backgroundColor: status.dot }}
                          />
                          <Text className="text-sm text-slate-500">
                            {formatTime(appointment.dateTime)} - {formatTime(appointment.endTime)}
                          </Text>
                        </View>
                        <Text className="text-base font-semibold text-slate-900 mb-1">
                          {appointment.client?.name || 'Unknown Client'}
                        </Text>
                        <View className="flex-row items-center">
                          <Text className="text-sm text-slate-500">
                            {appointment.service?.title || 'No service'}
                          </Text>
                          {appointment.service?.price && (
                            <View className="flex-row items-center ml-2">
                              <View className="w-1 h-1 rounded-full bg-slate-300 mx-1.5" />
                              <Text className="text-sm font-semibold text-indigo-600">
                                ₹{appointment.service.price.toLocaleString()}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View className={`px-2.5 py-1 rounded-full ${status.bg}`}>
                        <Text className={`text-xs font-medium capitalize ${status.text}`}>
                          {appointment.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-indigo-500 items-center justify-center shadow-lg shadow-indigo-300"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/new-appointment');
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
