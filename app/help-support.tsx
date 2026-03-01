import { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, PressableCard } from '@/components/ui/Card';
import { api } from '@/lib/api';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I add a new client?',
    answer: 'Go to the Clients tab and tap the + button in the top right corner. Fill in your client\'s details and tap Save.',
  },
  {
    question: 'How do I schedule a recurring appointment?',
    answer: 'When creating an appointment, toggle on "Repeat" and select your preferred pattern (weekly, bi-weekly, or monthly). Set an end date and all appointments will be created automatically.',
  },
  {
    question: 'How do I cancel an appointment?',
    answer: 'Open the appointment details by tapping on it, then tap the Cancel button. The client will be notified if you have their contact details.',
  },
  {
    question: 'How do I edit my services?',
    answer: 'Go to the Services tab to see all your services. Tap on any service to edit its details like price, duration, or description.',
  },
  {
    question: 'How do I send reminders to clients?',
    answer: 'Tap on any appointment to open details, then tap the WhatsApp icon to send a reminder message directly to your client.',
  },
  {
    question: 'How do I view my analytics?',
    answer: 'Tap on the Analytics tab to see your revenue, top clients, completion rates, and busiest days. You can filter by 7, 30, or 90 days.',
  },
];

interface SupportOptionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  color?: string;
}

function SupportOption({ icon, title, subtitle, onPress, color = '#6366F1' }: SupportOptionProps) {
  return (
    <PressableCard
      variant="outlined"
      padding="md"
      className="mb-3"
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${color}15` }}
        >
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-medium text-slate-900">{title}</Text>
          <Text className="text-sm text-slate-500">{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </View>
    </PressableCard>
  );
}

export default function HelpSupportScreen() {
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const handleEmailSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:techworks12@gmail.com?subject=Claw Support Request');
  };

  const handleWhatsAppSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('https://wa.me/917898488563?text=Hi, I need help with Claw app');
  };

  const handleRateApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRatingModal(true);
  };

  const handleStarPress = (rating: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRating(rating);
  };

  const submitRating = async () => {
    if (selectedRating === 0) {
      Alert.alert('Please select a rating', 'Tap the stars to rate us');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitRating(selectedRating);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasRated(true);
      setShowRatingModal(false);
      Alert.alert('Thank you!', 'Your feedback helps us improve Claw');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
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
          className="mr-4"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-900">Help & Support</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact Support */}
        <Text className="text-sm font-medium text-slate-500 mb-3">CONTACT US</Text>
        <SupportOption
          icon="mail-outline"
          title="Email Support"
          subtitle="We typically reply within 24 hours"
          onPress={handleEmailSupport}
        />
        <SupportOption
          icon="logo-whatsapp"
          title="WhatsApp Support"
          subtitle="Chat with us for quick help"
          onPress={handleWhatsAppSupport}
          color="#25D366"
        />

        {/* FAQ */}
        <Text className="text-sm font-medium text-slate-500 mb-3 mt-6">FREQUENTLY ASKED QUESTIONS</Text>
        <Card variant="elevated" className="mb-6">
          {FAQ_ITEMS.map((item, index) => (
            <View
              key={index}
              className={`py-4 ${index !== FAQ_ITEMS.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <View className="flex-row items-start">
                <View className="w-6 h-6 rounded-full bg-indigo-100 items-center justify-center mr-3 mt-0.5">
                  <Text className="text-xs font-bold text-indigo-600">Q</Text>
                </View>
                <Text className="flex-1 text-base font-medium text-slate-900">
                  {item.question}
                </Text>
              </View>
              <View className="flex-row items-start mt-2 ml-9">
                <Text className="text-sm text-slate-600 leading-5">
                  {item.answer}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Rate App */}
        <Text className="text-sm font-medium text-slate-500 mb-3">ENJOYING CLAW?</Text>
        <SupportOption
          icon={hasRated ? "star" : "star-outline"}
          title={hasRated ? "Thanks for Rating!" : "Rate Us"}
          subtitle={hasRated ? "You rated us" : "Help us improve with your feedback"}
          onPress={handleRateApp}
          color="#F59E0B"
        />

        {/* Version Info */}
        <View className="items-center mt-6 py-4">
          <View className="w-16 h-16 rounded-2xl bg-indigo-100 items-center justify-center mb-3">
            <Ionicons name="calendar" size={32} color="#6366F1" />
          </View>
          <Text className="text-base font-semibold text-slate-900">Claw</Text>
          <Text className="text-sm text-slate-500">Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-amber-100 items-center justify-center mb-3">
                <Ionicons name="star" size={32} color="#F59E0B" />
              </View>
              <Text className="text-xl font-bold text-slate-900">Rate Claw</Text>
              <Text className="text-sm text-slate-500 text-center mt-1">
                How would you rate your experience?
              </Text>
            </View>

            {/* Star Rating */}
            <View className="flex-row justify-center mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  className="mx-1"
                >
                  <Ionicons
                    name={star <= selectedRating ? "star" : "star-outline"}
                    size={40}
                    color={star <= selectedRating ? "#F59E0B" : "#CBD5E1"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {selectedRating > 0 && (
              <Text className="text-center text-slate-600 mb-4">
                {selectedRating === 5 ? "Excellent!" :
                 selectedRating === 4 ? "Great!" :
                 selectedRating === 3 ? "Good" :
                 selectedRating === 2 ? "Fair" : "Poor"}
              </Text>
            )}

            {/* Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowRatingModal(false);
                  setSelectedRating(0);
                }}
                className="flex-1 py-3 rounded-xl bg-slate-100"
              >
                <Text className="text-center font-medium text-slate-600">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRating}
                disabled={isSubmitting || selectedRating === 0}
                className={`flex-1 py-3 rounded-xl ${
                  selectedRating > 0 ? 'bg-amber-500' : 'bg-slate-200'
                }`}
              >
                <Text className={`text-center font-medium ${
                  selectedRating > 0 ? 'text-white' : 'text-slate-400'
                }`}>
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
