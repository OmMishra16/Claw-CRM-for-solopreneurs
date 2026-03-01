import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Appointment } from '@/types';

// Check if we're running in Expo Go (limited notification support)
const isExpoGo = Constants.appOwnership === 'expo';

// Configure how notifications appear when app is in foreground
// Only set up if not in Expo Go to avoid errors
if (!isExpoGo) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        // shouldShowAlert was split into banner + list in Expo SDK 53; it is kept
        // for older clients and ignored where the newer fields are supported.
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // Silently ignore - expo-notifications has limited support in Expo Go
  }
}

// Store notification IDs for each appointment
const scheduledNotifications: Map<string, string> = new Map();

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Skip in Expo Go - notifications have limited support
  if (isExpoGo) {
    console.log('Notifications limited in Expo Go - WhatsApp reminders still work!');
    return false;
  }

  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    // Android-specific channel setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Appointment Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    return true;
  } catch (error) {
    console.log('Notification setup error:', error);
    return false;
  }
}

/**
 * Schedule a reminder notification for an appointment
 * Fires 1 hour before the appointment time
 */
export async function scheduleAppointmentReminder(appointment: Appointment): Promise<string | null> {
  // Skip in Expo Go
  if (isExpoGo) return null;

  const appointmentTime = new Date(appointment.dateTime);
  const reminderTime = new Date(appointmentTime.getTime() - 60 * 60 * 1000); // 1 hour before
  const now = new Date();

  // Don't schedule if reminder time has already passed
  if (reminderTime <= now) {
    console.log('Reminder time has already passed, skipping');
    return null;
  }

  // Cancel existing notification for this appointment if any
  await cancelAppointmentReminder(appointment.id);

  const clientName = appointment.client?.name || 'Client';
  const serviceName = appointment.service?.title || 'Appointment';
  const timeString = appointmentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Upcoming: ${clientName}`,
        body: `${serviceName} in 1 hour at ${timeString}`,
        data: {
          appointmentId: appointment.id,
          screen: 'reminder',
          clientName,
          serviceName,
          time: timeString,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        date: reminderTime,
        channelId: 'reminders',
      },
    });

    scheduledNotifications.set(appointment.id, notificationId);
    console.log(`Scheduled reminder for ${clientName} at ${reminderTime.toISOString()}`);
    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled reminder for an appointment
 */
export async function cancelAppointmentReminder(appointmentId: string): Promise<void> {
  if (isExpoGo) return;

  const notificationId = scheduledNotifications.get(appointmentId);
  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      scheduledNotifications.delete(appointmentId);
      console.log(`Cancelled reminder for appointment ${appointmentId}`);
    } catch (error) {
      console.log('Failed to cancel notification:', error);
    }
  }
}

/**
 * Schedule reminders for all upcoming appointments today
 */
export async function scheduleAllTodayReminders(appointments: Appointment[]): Promise<void> {
  const now = new Date();

  for (const appointment of appointments) {
    // Only schedule for pending/confirmed appointments
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      continue;
    }

    const appointmentTime = new Date(appointment.dateTime);

    // Only schedule if appointment is in the future
    if (appointmentTime > now) {
      await scheduleAppointmentReminder(appointment);
    }
  }
}

/**
 * Cancel all scheduled reminders
 */
export async function cancelAllReminders(): Promise<void> {
  if (isExpoGo) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    scheduledNotifications.clear();
    console.log('Cancelled all scheduled reminders');
  } catch (error) {
    console.log('Failed to cancel all notifications:', error);
  }
}

// Dummy subscription for Expo Go
const dummySubscription = { remove: () => {} };

/**
 * Handle notification tap - navigate to reminder screen
 */
export function setupNotificationResponseHandler(): { remove: () => void } {
  if (isExpoGo) return dummySubscription;

  try {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      if (data?.appointmentId && data?.screen === 'reminder') {
        // Navigate to reminder screen
        router.push(`/appointment-reminder/${data.appointmentId}`);
      }
    });
  } catch (error) {
    console.log('Failed to setup notification response handler:', error);
    return dummySubscription;
  }
}

/**
 * Handle notification received while app is in foreground
 */
export function setupNotificationReceivedHandler(): { remove: () => void } {
  if (isExpoGo) return dummySubscription;

  try {
    return Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification.request.content.title);
    });
  } catch (error) {
    console.log('Failed to setup notification received handler:', error);
    return dummySubscription;
  }
}

/**
 * Generate WhatsApp reminder message
 */
export function generateReminderMessage(
  clientName: string,
  serviceName: string,
  time: string,
  businessName: string
): string {
  return `Hi ${clientName}! 👋

Quick reminder: Your ${serviceName} session is in 1 hour at ${time}.

See you soon!
- ${businessName}`;
}

/**
 * Open WhatsApp with pre-filled reminder message
 */
export function getWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
}
