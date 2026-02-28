import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { generateReminderMessage, getWhatsAppUrl } from '@/lib/notifications';
import { InactiveClient } from '@/types';

type PeriodDays = 7 | 30 | 90;

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodDays>(30);

  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: queryKeys.analyticsOverview(period),
    queryFn: () => api.getAnalyticsOverview(period),
  });

  const { data: inactiveData, refetch: refetchInactive } = useQuery({
    queryKey: queryKeys.inactiveClients(30),
    queryFn: () => api.getInactiveClients(30),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetch(), refetchInactive()]);
    setRefreshing(false);
  }, [refetch, refetchInactive]);

  const handleWinBack = async (client: InactiveClient) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const message = `Hi ${client.name}! 👋\n\nIt's been a while since we last met. Would you like to schedule a session?\n\nLooking forward to seeing you!\n- ${user?.businessName || 'Your practitioner'}`;
    const url = getWhatsAppUrl(client.phone, message);
    await Linking.openURL(url);
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  const getPeriodLabel = (days: PeriodDays) => {
    switch (days) {
      case 7: return '7 days';
      case 30: return '30 days';
      case 90: return '90 days';
    }
  };

  // Find busiest day
  const getBusiestDay = () => {
    if (!overview?.busiestDays) return null;
    const days = overview.busiestDays;
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    let maxDay = 'monday';
    let maxCount = 0;
    dayNames.forEach(day => {
      if (days[day] > maxCount) {
        maxCount = days[day];
        maxDay = day;
      }
    });
    return maxCount > 0 ? maxDay.charAt(0).toUpperCase() + maxDay.slice(1) : null;
  };

  const maxDayCount = overview?.busiestDays
    ? Math.max(...Object.values(overview.busiestDays))
    : 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 bg-white border-b border-slate-100">
        <Text className="text-2xl font-bold text-slate-900">Analytics</Text>
        <Text className="text-sm text-slate-500">Track your business performance</Text>
      </View>

      {/* Period Selector */}
      <View className="flex-row px-5 py-3 bg-white border-b border-slate-100">
        {([7, 30, 90] as PeriodDays[]).map((days) => (
          <TouchableOpacity
            key={days}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPeriod(days);
            }}
            className={`mr-2 px-4 py-2 rounded-full ${
              period === days ? 'bg-indigo-500' : 'bg-slate-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                period === days ? 'text-white' : 'text-slate-600'
              }`}
            >
              {getPeriodLabel(days)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color="#6366F1" />
            <Text className="text-sm text-slate-400 mt-3">Loading analytics...</Text>
          </View>
        ) : (
          <>
            {/* Revenue Card */}
            <Card variant="elevated" className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm text-slate-500">Total Revenue</Text>
                <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center">
                  <Ionicons name="wallet" size={20} color="#059669" />
                </View>
              </View>
              <Text className="text-3xl font-bold text-slate-900">
                {formatCurrency(overview?.revenue.total || 0)}
              </Text>
              {overview?.revenue.changePercent !== undefined && (
                <View className="flex-row items-center mt-2">
                  <Ionicons
                    name={overview.revenue.changePercent >= 0 ? 'trending-up' : 'trending-down'}
                    size={16}
                    color={overview.revenue.changePercent >= 0 ? '#059669' : '#DC2626'}
                  />
                  <Text
                    className={`text-sm ml-1 ${
                      overview.revenue.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {overview.revenue.changePercent >= 0 ? '+' : ''}
                    {overview.revenue.changePercent}% vs previous {getPeriodLabel(period)}
                  </Text>
                </View>
              )}
            </Card>

            {/* Revenue by Service */}
            {overview?.revenueByService && overview.revenueByService.length > 0 && (
              <Card variant="outlined" className="mb-4">
                <Text className="text-base font-semibold text-slate-900 mb-3">Revenue by Service</Text>
                {overview.revenueByService.map((service, index) => {
                  const maxRevenue = overview.revenueByService[0]?.revenue || 1;
                  const percentage = (service.revenue / maxRevenue) * 100;
                  return (
                    <View key={service.serviceId} className="mb-3 last:mb-0">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                          {service.title}
                        </Text>
                        <Text className="text-sm font-semibold text-slate-900 ml-2">
                          {formatCurrency(service.revenue)}
                        </Text>
                      </View>
                      <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </View>
                      <Text className="text-xs text-slate-400 mt-1">
                        {service.count} appointment{service.count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  );
                })}
              </Card>
            )}

            {/* Top Clients */}
            {overview?.topClients && overview.topClients.length > 0 && (
              <Card variant="outlined" className="mb-4">
                <Text className="text-base font-semibold text-slate-900 mb-3">Top Clients</Text>
                {overview.topClients.map((client, index) => (
                  <View
                    key={client.clientId}
                    className="flex-row items-center py-2 border-b border-slate-50 last:border-b-0"
                  >
                    <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center mr-3">
                      <Text className="text-sm font-bold text-indigo-600">{index + 1}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-slate-900">{client.name}</Text>
                      <Text className="text-xs text-slate-400">
                        {client.appointmentCount} appointment{client.appointmentCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(client.revenue)}
                    </Text>
                  </View>
                ))}
              </Card>
            )}

            {/* Win-back Alerts */}
            {inactiveData && inactiveData.count > 0 && (
              <Card variant="outlined" className="mb-4 bg-amber-50 border-amber-200">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="alert-circle" size={20} color="#D97706" />
                  <Text className="text-base font-semibold text-amber-800 ml-2">
                    Win-back Alerts
                  </Text>
                </View>
                <Text className="text-sm text-amber-700 mb-3">
                  {inactiveData.count} client{inactiveData.count !== 1 ? 's' : ''} inactive for 30+ days
                </Text>
                {inactiveData.clients.slice(0, 3).map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    onPress={() => handleWinBack(client)}
                    className="flex-row items-center bg-white rounded-xl p-3 mb-2 last:mb-0"
                    activeOpacity={0.7}
                  >
                    <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-3">
                      <Text className="text-amber-700 font-bold">
                        {client.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-slate-900">{client.name}</Text>
                      <Text className="text-xs text-slate-500">
                        {client.daysSinceVisit === -1
                          ? 'Never visited'
                          : `${client.daysSinceVisit} days ago`}
                      </Text>
                    </View>
                    <View className="flex-row items-center bg-green-500 px-3 py-1.5 rounded-full">
                      <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
                      <Text className="text-xs font-medium text-white ml-1">Reach out</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            {/* Completion Rate */}
            {overview?.completionRate && overview.completionRate.total > 0 && (
              <Card variant="outlined" className="mb-4">
                <Text className="text-base font-semibold text-slate-900 mb-3">Completion Rate</Text>
                <View className="flex-row items-center justify-around">
                  <View className="items-center">
                    <View className="w-14 h-14 rounded-full bg-emerald-100 items-center justify-center mb-1">
                      <Text className="text-lg font-bold text-emerald-600">
                        {overview.completionRate.completed}%
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-500">Completed</Text>
                  </View>
                  <View className="items-center">
                    <View className="w-14 h-14 rounded-full bg-red-100 items-center justify-center mb-1">
                      <Text className="text-lg font-bold text-red-600">
                        {overview.completionRate.cancelled}%
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-500">Cancelled</Text>
                  </View>
                  <View className="items-center">
                    <View className="w-14 h-14 rounded-full bg-amber-100 items-center justify-center mb-1">
                      <Text className="text-lg font-bold text-amber-600">
                        {overview.completionRate.pending}%
                      </Text>
                    </View>
                    <Text className="text-xs text-slate-500">Pending</Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-400 text-center mt-3">
                  Based on {overview.completionRate.total} appointments
                </Text>
              </Card>
            )}

            {/* Busiest Days */}
            {overview?.busiestDays && maxDayCount > 0 && (
              <Card variant="outlined" className="mb-4">
                <Text className="text-base font-semibold text-slate-900 mb-3">Busiest Days</Text>
                <View className="flex-row justify-between items-end h-24 mb-2">
                  {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((day, index) => {
                    const dayKey = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index] as keyof typeof overview.busiestDays;
                    const count = overview.busiestDays[dayKey];
                    const height = maxDayCount > 0 ? (count / maxDayCount) * 100 : 0;
                    const isBusiest = count === maxDayCount && count > 0;
                    return (
                      <View key={day} className="items-center flex-1">
                        <View
                          className={`w-6 rounded-t-md ${isBusiest ? 'bg-indigo-500' : 'bg-slate-200'}`}
                          style={{ height: Math.max(height * 0.8, 4) }}
                        />
                        <Text className={`text-xs mt-1 ${isBusiest ? 'text-indigo-600 font-semibold' : 'text-slate-500'}`}>
                          {day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                {getBusiestDay() && (
                  <View className="flex-row items-center justify-center bg-indigo-50 rounded-lg py-2 mt-2">
                    <Ionicons name="star" size={14} color="#6366F1" />
                    <Text className="text-sm text-indigo-700 ml-1">
                      Peak day: <Text className="font-semibold">{getBusiestDay()}</Text>
                    </Text>
                  </View>
                )}
              </Card>
            )}

            {/* Empty State */}
            {!overview?.completionRate?.total && (
              <Card variant="outlined" className="items-center py-10">
                <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
                  <Ionicons name="analytics-outline" size={32} color="#94A3B8" />
                </View>
                <Text className="text-lg font-semibold text-slate-900 mb-1">No data yet</Text>
                <Text className="text-sm text-slate-500 text-center px-4">
                  Complete some appointments to see your analytics
                </Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
