import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, PressableCard } from '@/components/ui/Card';
import { Client, Service, RecurrencePattern } from '@/types';

export default function NewAppointmentScreen() {
  const { clientId: preselectedClientId } = useLocalSearchParams<{ clientId?: string }>();
  const queryClient = useQueryClient();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(preselectedClientId || null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [dateTime, setDateTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 2); // Default 2 months ahead
    return date;
  });
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Fetch clients and services
  const { data: clientsData, isLoading: loadingClients } = useQuery({
    queryKey: queryKeys.clients,
    queryFn: () => api.getClients(),
  });

  const { data: servicesData, isLoading: loadingServices } = useQuery({
    queryKey: queryKeys.services,
    queryFn: () => api.getServices(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.createAppointment>[0]) => api.createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.todayAppointments });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      router.back();
    },
    onError: (error: any) => {
      const message = error?.message || 'Failed to book appointment';
      if (message.includes('conflict')) {
        Alert.alert('Time Slot Unavailable', 'This time conflicts with another appointment. Please choose a different time.');
      } else {
        Alert.alert('Booking Failed', message);
      }
    },
  });

  const clients = clientsData?.clients || [];
  const services = servicesData?.services?.filter((s) => s.isActive) || [];

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Filter clients based on search
  const filteredClients = clientSearch.trim()
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phone.includes(clientSearch)
      )
    : [];

  // Quick picks - show first 5 clients when not searching
  const quickPickClients = clients.slice(0, 5);

  // Calculate recurring appointments count
  const calculateRecurringCount = () => {
    if (!isRecurring) return 1;

    const start = new Date(dateTime);
    const end = new Date(recurrenceEndDate);
    end.setHours(23, 59, 59, 999);

    let count = 0;
    let current = new Date(start);

    while (current <= end && count < 52) {
      count++;
      switch (recurrencePattern) {
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'biweekly':
          current.setDate(current.getDate() + 14);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return count;
  };

  const recurringCount = calculateRecurringCount();

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDateTime = new Date(dateTime);
      newDateTime.setFullYear(selectedDate.getFullYear());
      newDateTime.setMonth(selectedDate.getMonth());
      newDateTime.setDate(selectedDate.getDate());
      setDateTime(newDateTime);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDateTime = new Date(dateTime);
      newDateTime.setHours(selectedTime.getHours());
      newDateTime.setMinutes(selectedTime.getMinutes());
      setDateTime(newDateTime);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setRecurrenceEndDate(selectedDate);
    }
  };

  const handleSubmit = () => {
    if (!selectedClientId) {
      Alert.alert('Error', 'Please select a client');
      return;
    }
    if (!selectedServiceId) {
      Alert.alert('Error', 'Please select a service');
      return;
    }

    createMutation.mutate({
      clientId: selectedClientId,
      serviceId: selectedServiceId,
      dateTime: dateTime.toISOString(),
      notes: notes.trim() || undefined,
      isRecurring,
      recurrencePattern: isRecurring ? recurrencePattern : undefined,
      recurrenceEndDate: isRecurring ? recurrenceEndDate.toISOString() : undefined,
    });
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-900">New Appointment</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Select Client */}
        <View className="mb-5">
          <Text className="text-sm font-medium text-slate-700 mb-2">Select Client</Text>
          {loadingClients ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : clients.length === 0 ? (
            <Card variant="outlined" className="items-center py-4">
              <Text className="text-slate-500 mb-2">No clients yet</Text>
              <Button
                title="Add Client"
                size="sm"
                variant="outline"
                onPress={() => router.push('/new-client')}
              />
            </Card>
          ) : (
            <View>
              {/* Selected Client Display */}
              {selectedClient && !clientSearch && (
                <View className="mb-3 p-3 rounded-xl bg-indigo-50 border-2 border-indigo-500 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 rounded-full bg-indigo-500 items-center justify-center mr-3">
                      <Text className="text-white font-bold">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text className="font-semibold text-indigo-900">{selectedClient.name}</Text>
                      <Text className="text-xs text-indigo-600">{selectedClient.phone}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedClientId(null)}
                    className="p-2"
                  >
                    <Ionicons name="close-circle" size={22} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Search Input */}
              {(!selectedClient || clientSearch) && (
                <View className="mb-3">
                  <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                      placeholder="Search by name or phone..."
                      placeholderTextColor="#94A3B8"
                      value={clientSearch}
                      onChangeText={setClientSearch}
                      className="flex-1 ml-3 text-base text-slate-900"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {clientSearch.length > 0 && (
                      <TouchableOpacity onPress={() => setClientSearch('')}>
                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Search Results */}
              {clientSearch.trim() && (
                <View>
                  {filteredClients.length === 0 ? (
                    <View className="py-4 items-center">
                      <Text className="text-slate-500 mb-2">No clients found</Text>
                      <TouchableOpacity
                        onPress={() => router.push('/new-client')}
                        className="flex-row items-center"
                      >
                        <Ionicons name="add-circle" size={18} color="#6366F1" />
                        <Text className="text-indigo-600 font-medium ml-1">Add new client</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    filteredClients.slice(0, 10).map((client) => (
                      <TouchableOpacity
                        key={client.id}
                        className={`mb-2 p-3 rounded-xl border flex-row items-center ${
                          selectedClientId === client.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 bg-white'
                        }`}
                        onPress={() => {
                          setSelectedClientId(client.id);
                          setClientSearch('');
                        }}
                      >
                        <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3">
                          <Text className="text-slate-600 font-semibold">
                            {client.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="font-medium text-slate-900">{client.name}</Text>
                          <Text className="text-xs text-slate-500">{client.phone}</Text>
                        </View>
                        {selectedClientId === client.id && (
                          <Ionicons name="checkmark-circle" size={22} color="#6366F1" />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* Quick Picks (when not searching and no client selected) */}
              {!clientSearch && !selectedClient && (
                <View>
                  <Text className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Quick Pick</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {quickPickClients.map((client) => (
                      <TouchableOpacity
                        key={client.id}
                        className={`mr-3 px-4 py-3 rounded-xl border-2 ${
                          selectedClientId === client.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200 bg-white'
                        }`}
                        onPress={() => setSelectedClientId(client.id)}
                      >
                        <Text
                          className={`font-medium ${
                            selectedClientId === client.id ? 'text-indigo-600' : 'text-slate-900'
                          }`}
                        >
                          {client.name}
                        </Text>
                        <Text className="text-xs text-slate-500">{client.phone}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {clients.length > 5 && (
                    <Text className="text-xs text-slate-400 mt-2">
                      {clients.length - 5} more clients • Search to find
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Select Service */}
        <View className="mb-5">
          <Text className="text-sm font-medium text-slate-700 mb-2">Select Service</Text>
          {loadingServices ? (
            <ActivityIndicator size="small" color="#6366F1" />
          ) : services.length === 0 ? (
            <Card variant="outlined" className="items-center py-4">
              <Text className="text-slate-500 mb-2">No services yet</Text>
              <Button
                title="Add Service"
                size="sm"
                variant="outline"
                onPress={() => router.push('/new-service')}
              />
            </Card>
          ) : (
            <View>
              {services.map((service) => (
                <TouchableOpacity
                  key={service.id}
                  className={`mb-2 p-4 rounded-xl border-2 ${
                    selectedServiceId === service.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 bg-white'
                  }`}
                  onPress={() => setSelectedServiceId(service.id)}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text
                        className={`font-medium ${
                          selectedServiceId === service.id ? 'text-indigo-600' : 'text-slate-900'
                        }`}
                      >
                        {service.title}
                      </Text>
                      <Text className="text-sm text-slate-500">{service.duration} min</Text>
                    </View>
                    <Text className="text-lg font-semibold text-indigo-600">
                      ₹{service.price.toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View className="mb-5">
          <Text className="text-sm font-medium text-slate-700 mb-2">Date & Time</Text>
          <View className="flex-row">
            <TouchableOpacity
              className="flex-1 flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3.5 mr-2"
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
              <Text className="flex-1 ml-2 text-slate-900">{formatDate(dateTime)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3.5 ml-2"
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#64748B" />
              <Text className="flex-1 ml-2 text-slate-900">{formatTime(dateTime)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recurring Appointment */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3.5">
            <View className="flex-row items-center">
              <Ionicons name="repeat" size={20} color="#64748B" />
              <Text className="ml-3 text-base text-slate-900">Repeat</Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
              thumbColor={isRecurring ? '#6366F1' : '#94A3B8'}
            />
          </View>

          {isRecurring && (
            <View className="mt-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              {/* Pattern Selection */}
              <Text className="text-sm font-medium text-slate-700 mb-2">Frequency</Text>
              <View className="flex-row mb-4">
                {(['weekly', 'biweekly', 'monthly'] as RecurrencePattern[]).map((pattern) => (
                  <TouchableOpacity
                    key={pattern}
                    onPress={() => setRecurrencePattern(pattern)}
                    className={`flex-1 py-2.5 rounded-lg mr-2 last:mr-0 ${
                      recurrencePattern === pattern
                        ? 'bg-indigo-500'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-center text-sm font-medium capitalize ${
                        recurrencePattern === pattern ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      {pattern === 'biweekly' ? 'Bi-weekly' : pattern}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* End Date */}
              <Text className="text-sm font-medium text-slate-700 mb-2">Until</Text>
              <TouchableOpacity
                className="flex-row items-center bg-white border border-slate-200 rounded-xl px-4 py-3"
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color="#64748B" />
                <Text className="flex-1 ml-2 text-slate-900">{formatDate(recurrenceEndDate)}</Text>
              </TouchableOpacity>

              {/* Preview */}
              <View className="mt-3 flex-row items-center bg-white rounded-lg px-3 py-2">
                <Ionicons name="information-circle" size={18} color="#6366F1" />
                <Text className="ml-2 text-sm text-indigo-700">
                  Will create {recurringCount} appointment{recurringCount > 1 ? 's' : ''}
                  {selectedService && (
                    <Text className="font-semibold">
                      {' '}• ₹{(selectedService.price * recurringCount).toLocaleString()} total
                    </Text>
                  )}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-slate-700 mb-2">Notes (Optional)</Text>
          <View className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <Input
              placeholder="Add notes for this appointment..."
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              style={{ height: 80, textAlignVertical: 'top' }}
            />
          </View>
        </View>

        {/* Summary */}
        {selectedClient && selectedService && (
          <Card variant="elevated" className="mb-6">
            <Text className="text-sm font-medium text-slate-500 mb-2">Summary</Text>
            <Text className="text-base text-slate-900 mb-1">{selectedClient.name}</Text>
            <Text className="text-sm text-slate-500 mb-1">
              {selectedService.title} • {selectedService.duration} min
            </Text>
            <Text className="text-sm text-slate-500 mb-2">
              {formatDate(dateTime)} at {formatTime(dateTime)}
            </Text>
            <Text className="text-xl font-bold text-indigo-600">
              ₹{selectedService.price.toLocaleString()}
            </Text>
          </Card>
        )}

        <Button
          title={isRecurring ? `Book ${recurringCount} Appointments` : 'Book Appointment'}
          onPress={handleSubmit}
          loading={createMutation.isPending}
          fullWidth
          size="lg"
          disabled={!selectedClientId || !selectedServiceId}
        />
      </ScrollView>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={dateTime}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={dateTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          minuteInterval={15}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={recurrenceEndDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={dateTime}
        />
      )}
    </SafeAreaView>
  );
}
