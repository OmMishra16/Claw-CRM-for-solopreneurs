import * as SecureStore from 'expo-secure-store';
import {
  User,
  Service,
  Client,
  Appointment,
  CreateServiceData,
  CreateClientData,
  CreateAppointmentData,
  AuthResponse,
  StatsResponse,
  TodayResponse,
  AppointmentStatus,
  AnalyticsOverview,
  InactiveClientsResponse,
} from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch {
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();

    // Record<string, string> rather than HeadersInit: the union type HeadersInit
    // includes Headers and string[][], neither of which supports index assignment.
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  // Auth
  async register(email: string, password: string, businessName: string, phone?: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, businessName, phone }),
    });
    await SecureStore.setItemAsync('auth_token', response.token);
    return response;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await SecureStore.setItemAsync('auth_token', response.token);
    return response;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('auth_token');
  }

  async updateProfile(data: { businessName?: string; phone?: string }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Services
  async getServices(): Promise<{ services: Service[] }> {
    return this.request<{ services: Service[] }>('/services');
  }

  async createService(data: CreateServiceData): Promise<{ service: Service }> {
    return this.request<{ service: Service }>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateService(id: string, data: Partial<CreateServiceData>): Promise<{ service: Service }> {
    return this.request<{ service: Service }>(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteService(id: string): Promise<void> {
    await this.request(`/services/${id}`, { method: 'DELETE' });
  }

  // Clients
  async getClients(search?: string): Promise<{ clients: Client[] }> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<{ clients: Client[] }>(`/clients${params}`);
  }

  async getClient(id: string): Promise<{ client: Client & { appointments: Appointment[] } }> {
    return this.request<{ client: Client & { appointments: Appointment[] } }>(`/clients/${id}`);
  }

  async createClient(data: CreateClientData): Promise<{ client: Client }> {
    return this.request<{ client: Client }>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: Partial<CreateClientData>): Promise<{ client: Client }> {
    return this.request<{ client: Client }>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string): Promise<void> {
    await this.request(`/clients/${id}`, { method: 'DELETE' });
  }

  // Appointments
  async getAppointments(params?: {
    startDate?: string;
    endDate?: string;
    status?: AppointmentStatus;
    clientId?: string;
  }): Promise<{ appointments: Appointment[] }> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.clientId) searchParams.set('clientId', params.clientId);

    const query = searchParams.toString();
    return this.request<{ appointments: Appointment[] }>(`/appointments${query ? `?${query}` : ''}`);
  }

  async getTodayAppointments(): Promise<TodayResponse> {
    return this.request<TodayResponse>('/appointments/today');
  }

  async getStats(): Promise<StatsResponse> {
    return this.request<StatsResponse>('/appointments/stats');
  }

  async createAppointment(data: CreateAppointmentData): Promise<{ appointment: Appointment }> {
    return this.request<{ appointment: Appointment }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<{ appointment: Appointment }> {
    return this.request<{ appointment: Appointment }>(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updateAppointment(id: string, data: Partial<CreateAppointmentData>): Promise<{ appointment: Appointment }> {
    return this.request<{ appointment: Appointment }>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAppointment(id: string): Promise<void> {
    await this.request(`/appointments/${id}`, { method: 'DELETE' });
  }

  async cancelAppointmentSeries(seriesId: string): Promise<{ cancelledCount: number }> {
    return this.request<{ cancelledCount: number }>(`/appointments/series/${seriesId}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getAnalyticsOverview(days?: number): Promise<AnalyticsOverview> {
    const params = days ? `?days=${days}` : '';
    return this.request<AnalyticsOverview>(`/analytics/overview${params}`);
  }

  async getInactiveClients(days?: number): Promise<InactiveClientsResponse> {
    const params = days ? `?days=${days}` : '';
    return this.request<InactiveClientsResponse>(`/analytics/inactive-clients${params}`);
  }

  // Ratings
  async submitRating(rating: number): Promise<{ message: string; rating: any }> {
    return this.request<{ message: string; rating: any }>('/ratings', {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
  }

  async getMyRating(): Promise<{ rating: any }> {
    return this.request<{ rating: any }>('/ratings/me');
  }

  // Password Reset
  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  }
}

export const api = new ApiClient();
