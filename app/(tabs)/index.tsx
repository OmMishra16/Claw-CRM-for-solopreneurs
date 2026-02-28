import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Appointment, AppointmentStatus } from '@/types';
import {
  generateReminderMessage,
  getWhatsAppUrl,
  scheduleAllTodayReminders,
  cancelAppointmentReminder,
} from '@/lib/notifications';

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-100', text: 'text-amber-600', dot: '#F59E0B' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-600', dot: '#3B82F6' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-600', dot: '#10B981' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', dot: '#94A3B8' },
};

function SwipeableAppointmentCard({
  appointment,
  onPress,
  onComplete,
  onCancel,
  onRemind,
  businessName,
}: {
  appointment: Appointment;
  onPress: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onRemind: () => void;
  businessName: string;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  const time = new Date(appointment.dateTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const endTime = new Date(appointment.endTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const status = statusColors[appointment.status] || statusColors.pending;
  const isActionable = appointment.status !== 'completed' && appointment.status !== 'cancelled';
  const hasPhone = !!appointment.client?.phone;

  const handleQuickRemind = async (e: any) => {
    e.stopPropagation();
    if (!hasPhone) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const message = generateReminderMessage(
      appointment.client?.name || 'Client',
      appointment.service?.title || 'appointment',
      time,
      businessName
    );

    const url = getWhatsAppUrl(appointment.client!.phone, message);
    await Linking.openURL(url);
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!isActionable) return null;

    const translateX = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={{ transform: [{ translateX }] }}
        className="flex-row items-center"
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            swipeableRef.current?.close();
            onCancel();
          }}
          className="w-20 h-full bg-slate-400 items-center justify-center"
        >
          <Animated.View style={{ transform: [{ scale }] }} className="items-center">
            <Ionicons name="close-circle" size={24} color="#FFFFFF" />
            <Text className="text-xs font-medium text-white mt-1">Cancel</Text>
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            swipeableRef.current?.close();
            onComplete();
          }}
          className="w-20 h-full bg-emerald-500 items-center justify-center rounded-r-xl"
        >
          <Animated.View style={{ transform: [{ scale }] }} className="items-center">
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text className="text-xs font-medium text-white mt-1">Done</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (!isActionable) return null;

    const translateX = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-80, 0],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={{ transform: [{ translateX }] }}
        className="flex-row items-center"
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            swipeableRef.current?.close();
            onComplete();
          }}
          className="w-20 h-full bg-emerald-500 items-center justify-center rounded-l-xl"
        >
          <Animated.View style={{ transform: [{ scale }] }} className="items-center">
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text className="text-xs font-medium text-white mt-1">Done</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleSwipeOpen = (direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={handleSwipeOpen}
      friction={2}
      overshootRight={false}
      overshootLeft={false}
      containerStyle={{ marginBottom: 12 }}
    >
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
        className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm"
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <View
                className="w-2.5 h-2.5 rounded-full mr-2"
                style={{ backgroundColor: status.dot }}
              />
              <Text className="text-sm text-slate-500">
                {time} - {endTime}
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

          {/* Right side: WhatsApp + Status */}
          <View className="flex-row items-center">
            {/* WhatsApp Quick Remind Button */}
            {isActionable && hasPhone && (
              <TouchableOpacity
                onPress={handleQuickRemind}
                className="w-9 h-9 rounded-full bg-green-50 items-center justify-center mr-2"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              </TouchableOpacity>
            )}
            <View className={`px-2.5 py-1 rounded-full ${status.bg}`}>
              <Text className={`text-xs font-medium capitalize ${status.text}`}>
                {appointment.status}
              </Text>
            </View>
          </View>
        </View>

        {isActionable && (
          <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-50">
            <View className="flex-row items-center">
              <Ionicons name="swap-horizontal" size={12} color="#94A3B8" />
              <Text className="text-xs text-slate-400 ml-1">Swipe for actions</Text>
            </View>
            {hasPhone && (
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-400 ml-1">Tap WhatsApp to remind</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: todayData, isLoading: loadingToday, refetch: refetchToday } = useQuery({
    queryKey: queryKeys.todayAppointments,
    queryFn: () => api.getTodayAppointments(),
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.getStats(),
  });

  // Schedule notifications for today's appointments when data loads
  useEffect(() => {
    if (todayData?.appointments) {
      scheduleAllTodayReminders(todayData.appointments);
    }
  }, [todayData?.appointments]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.updateAppointmentStatus(id, status),
    onSuccess: async (_, variables) => {
      // Cancel notification if appointment completed or cancelled
      if (variables.status === 'completed' || variables.status === 'cancelled') {
        await cancelAppointmentReminder(variables.id);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.todayAppointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchToday(), refetchStats()]);
    setRefreshing(false);
  }, [refetchToday, refetchStats]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    router.push(`/appointment/${appointment.id}`);
  };

  const handleComplete = (id: string) => {
    statusMutation.mutate({ id, status: 'completed' });
  };

  const handleCancel = (id: string) => {
    statusMutation.mutate({ id, status: 'cancelled' });
  };

  const handleRemind = (appointment: Appointment) => {
    router.push(`/appointment-reminder/${appointment.id}`);
  };

  const todayRevenue = todayData?.appointments
    ?.filter(a => a.status === 'completed')
    ?.reduce((sum, a) => sum + (a.service?.price || 0), 0) || 0;

  const pendingCount = todayData?.appointments?.filter(
    a => a.status === 'pending' || a.status === 'confirmed'
  ).length || 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-slate-100">
        <View>
          <Text className="text-2xl font-bold text-slate-900">
            {getGreeting()}
          </Text>
          <Text className="text-base text-slate-500">
            {user?.businessName || 'Your Business'}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View className="flex-row mb-6">
          <Card variant="elevated" className="flex-1 mr-2">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-slate-500">This Week</Text>
              <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center">
                <Ionicons name="trending-up" size={16} color="#6366F1" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-slate-900">
              ₹{statsData?.week.revenue.toLocaleString() || '0'}
            </Text>
            <Text className="text-xs text-slate-400 mt-1">
              {statsData?.week.count || 0} appointments
            </Text>
          </Card>
          <Card variant="elevated" className="flex-1 ml-2">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm text-slate-500">This Month</Text>
              <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center">
                <Ionicons name="wallet" size={16} color="#059669" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-slate-900">
              ₹{statsData?.month.revenue.toLocaleString() || '0'}
            </Text>
            <Text className="text-xs text-slate-400 mt-1">
              {statsData?.month.count || 0} appointments
            </Text>
          </Card>
        </View>

        {/* Today's Summary Mini Card */}
        {todayData?.appointments && todayData.appointments.length > 0 && (
          <Card variant="outlined" className="mb-6 bg-indigo-50 border-indigo-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-indigo-500 items-center justify-center mr-3">
                  <Ionicons name="today" size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text className="text-sm font-medium text-indigo-900">Today&apos;s Progress</Text>
                  <Text className="text-xs text-indigo-600">
                    {pendingCount} pending • ₹{todayRevenue.toLocaleString()} earned
                  </Text>
                </View>
              </View>
              <View className="bg-white px-3 py-1.5 rounded-full">
                <Text className="text-sm font-bold text-indigo-600">
                  {todayData.count}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Today's Agenda */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-slate-900">Today&apos;s Agenda</Text>
            <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/appointments');
                }}
                className="flex-row items-center"
              >
                <Text className="text-sm text-indigo-600 font-medium mr-1">See all</Text>
                <Ionicons name="arrow-forward" size={14} color="#6366F1" />
              </TouchableOpacity>
          </View>

          {loadingToday ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color="#6366F1" />
              <Text className="text-sm text-slate-400 mt-3">Loading appointments...</Text>
            </View>
          ) : !todayData?.appointments?.length ? (
            <Card variant="outlined" className="items-center py-10">
              <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
                <Ionicons name="calendar-outline" size={32} color="#94A3B8" />
              </View>
              <Text className="text-lg font-semibold text-slate-900 mb-1">
                No appointments today
              </Text>
              <Text className="text-sm text-slate-500 text-center mb-5 px-4">
                Your schedule is clear. Perfect time to book new clients!
              </Text>
              <Button
                title="Book Appointment"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/new-appointment');
                }}
                icon="add-circle"
              />
            </Card>
          ) : (
            <View>
              {todayData.appointments.map((appointment) => (
                <SwipeableAppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onPress={() => handleAppointmentPress(appointment)}
                  onComplete={() => handleComplete(appointment.id)}
                  onCancel={() => handleCancel(appointment.id)}
                  onRemind={() => handleRemind(appointment)}
                  businessName={user?.businessName || 'Your practitioner'}
                />
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</Text>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/new-client');
              }}
              className="flex-1 mr-2 bg-white rounded-xl p-4 border border-slate-100 items-center shadow-sm"
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center mb-3">
                <Ionicons name="person-add" size={22} color="#6366F1" />
              </View>
              <Text className="text-sm font-semibold text-slate-900">Add Client</Text>
              <Text className="text-xs text-slate-400 mt-0.5">New customer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/new-service');
              }}
              className="flex-1 ml-2 bg-white rounded-xl p-4 border border-slate-100 items-center shadow-sm"
              activeOpacity={0.7}
            >
              <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center mb-3">
                <Ionicons name="pricetag" size={22} color="#059669" />
              </View>
              <Text className="text-sm font-semibold text-slate-900">Add Service</Text>
              <Text className="text-xs text-slate-400 mt-0.5">New offering</Text>
            </TouchableOpacity>
          </View>
        </View>
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
