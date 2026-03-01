import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type Tab = 'terms' | 'privacy';

const TERMS_OF_SERVICE = `
Last updated: January 22, 2026

Welcome to Claw. By using our application, you agree to these Terms of Service.

1. ACCEPTANCE OF TERMS

By accessing or using Claw, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the application.

2. USE OF SERVICE

Claw provides scheduling and client management tools for solo practitioners. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.

3. USER RESPONSIBILITIES

You agree to:
- Provide accurate and complete information
- Maintain the security of your account
- Not use the service for any unlawful purpose
- Not attempt to gain unauthorized access to any part of the service

4. DATA AND CONTENT

You retain ownership of all data you enter into Claw. We do not claim ownership of your client information, appointment data, or business details.

5. SERVICE AVAILABILITY

We strive to maintain high availability but cannot guarantee uninterrupted access. We may perform maintenance that temporarily limits access to the service.

6. TERMINATION

We reserve the right to terminate or suspend your account at any time for violation of these terms.

7. LIMITATION OF LIABILITY

Claw is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages.

8. CHANGES TO TERMS

We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.

9. CONTACT

For questions about these Terms, contact us at legal@clawapp.com.
`;

const PRIVACY_POLICY = `
Last updated: January 22, 2026

Your privacy is important to us. This Privacy Policy explains how Claw collects, uses, and protects your information.

1. INFORMATION WE COLLECT

Personal Information:
- Email address
- Business name
- Phone number (optional)

Business Data:
- Client information you enter
- Appointment schedules
- Service details
- Transaction records

Usage Data:
- App usage patterns
- Device information
- Error logs

2. HOW WE USE YOUR INFORMATION

We use your information to:
- Provide and maintain the service
- Send appointment reminders
- Improve user experience
- Communicate important updates
- Provide customer support

3. DATA STORAGE AND SECURITY

Your data is stored securely using industry-standard encryption. We use Supabase for database storage with row-level security policies.

We implement:
- SSL/TLS encryption
- Secure token-based authentication
- Regular security audits

4. DATA SHARING

We do not sell your personal information. We may share data with:
- Service providers who assist in operating our service
- Law enforcement when required by law

5. YOUR RIGHTS

You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your account and data
- Export your data

6. DATA RETENTION

We retain your data for as long as your account is active. You can request deletion at any time by contacting support.

7. COOKIES AND TRACKING

The mobile app does not use cookies. We may collect anonymous analytics to improve the service.

8. CHILDREN'S PRIVACY

Claw is not intended for users under 18 years of age. We do not knowingly collect data from children.

9. CHANGES TO POLICY

We may update this policy periodically. We will notify you of significant changes via email or in-app notification.

10. CONTACT US

For privacy-related questions:
Email: privacy@clawapp.com
`;

export default function TermsPrivacyScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('terms');

  const switchTab = (tab: Tab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-100">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="mr-4"
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-slate-900">Terms & Privacy</Text>
      </View>

      {/* Tab Switcher */}
      <View className="flex-row px-5 py-3 bg-slate-50">
        <TouchableOpacity
          onPress={() => switchTab('terms')}
          className={`flex-1 py-2.5 rounded-xl mr-2 ${
            activeTab === 'terms' ? 'bg-indigo-500' : 'bg-white'
          }`}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'terms' ? 'text-white' : 'text-slate-600'
            }`}
          >
            Terms of Service
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => switchTab('privacy')}
          className={`flex-1 py-2.5 rounded-xl ${
            activeTab === 'privacy' ? 'bg-indigo-500' : 'bg-white'
          }`}
        >
          <Text
            className={`text-center font-medium ${
              activeTab === 'privacy' ? 'text-white' : 'text-slate-600'
            }`}
          >
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center mb-4">
          <Ionicons
            name={activeTab === 'terms' ? 'document-text-outline' : 'shield-checkmark-outline'}
            size={24}
            color="#6366F1"
          />
          <Text className="text-xl font-bold text-slate-900 ml-2">
            {activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </Text>
        </View>

        <Text className="text-sm text-slate-600 leading-6">
          {activeTab === 'terms' ? TERMS_OF_SERVICE.trim() : PRIVACY_POLICY.trim()}
        </Text>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
