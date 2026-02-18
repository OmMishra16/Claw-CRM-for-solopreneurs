export const colors = {
  // Primary - Deep Purple/Indigo
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',

  // Background
  background: '#FFFFFF',
  surface: '#F8FAFC',
  surfaceHover: '#F1F5F9',

  // Text
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',

  // Border
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Status colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Appointment status
  statusPending: '#F59E0B',
  statusConfirmed: '#3B82F6',
  statusCompleted: '#10B981',
  statusCancelled: '#94A3B8',

  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending: {
    bg: colors.warningLight,
    text: colors.warning,
    dot: colors.warning,
  },
  confirmed: {
    bg: colors.infoLight,
    text: colors.info,
    dot: colors.info,
  },
  completed: {
    bg: colors.successLight,
    text: colors.success,
    dot: colors.success,
  },
  cancelled: {
    bg: colors.surfaceHover,
    text: colors.textTertiary,
    dot: colors.textTertiary,
  },
};
