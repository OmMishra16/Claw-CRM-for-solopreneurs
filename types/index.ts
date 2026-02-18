// User types
export interface User {
  id: string;
  email: string;
  businessName: string;
  phone: string | null;
  createdAt?: string;
}

// Service types
export interface Service {
  id: string;
  title: string;
  duration: number;
  price: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateServiceData {
  title: string;
  duration: number;
  price: number;
  currency?: string;
  isActive?: boolean;
}

// Client types
export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  appointmentCount?: number;
  totalRevenue?: number;
  createdAt: string;
}

export interface CreateClientData {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

// Appointment types
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type RecurrencePattern = 'weekly' | 'biweekly' | 'monthly';

export interface Appointment {
  id: string;
  dateTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  // Recurrence fields
  seriesId?: string | null;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern | null;
  recurrenceEndDate?: string | null;
  client: {
    id: string;
    name: string;
    phone: string;
  } | null;
  service: {
    id: string;
    title: string;
    duration: number;
    price: number;
    currency: string;
  } | null;
}

export interface CreateAppointmentData {
  clientId: string;
  serviceId: string;
  dateTime: string;
  notes?: string;
  // Recurrence fields
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceEndDate?: string;
}

// API Response types
export interface ApiError {
  error: string;
  conflicts?: Array<{
    id: string;
    dateTime: string;
    endTime: string;
  }>;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface StatsResponse {
  week: {
    revenue: number;
    count: number;
  };
  month: {
    revenue: number;
    count: number;
  };
}

export interface TodayResponse {
  date: string;
  count: number;
  todayRevenue: number;
  appointments: Appointment[];
}

// Analytics types
export interface ServiceRevenue {
  serviceId: string;
  title: string;
  revenue: number;
  count: number;
}

export interface TopClient {
  clientId: string;
  name: string;
  phone: string;
  revenue: number;
  appointmentCount: number;
}

export interface InactiveClient {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  lastAppointment: string | null;
  daysSinceVisit: number;
}

export interface AnalyticsOverview {
  period: {
    start: string;
    end: string;
  };
  revenue: {
    total: number;
    previousPeriod: number;
    changePercent: number;
  };
  revenueByService: ServiceRevenue[];
  topClients: TopClient[];
  completionRate: {
    completed: number;
    cancelled: number;
    pending: number;
    total: number;
  };
  busiestDays: {
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
    saturday: number;
    sunday: number;
  };
}

export interface InactiveClientsResponse {
  clients: InactiveClient[];
  count: number;
}
