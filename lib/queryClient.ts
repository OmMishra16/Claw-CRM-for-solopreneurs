import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys for cache management
export const queryKeys = {
  services: ['services'] as const,
  clients: ['clients'] as const,
  clientDetail: (id: string) => ['clients', id] as const,
  appointments: ['appointments'] as const,
  todayAppointments: ['appointments', 'today'] as const,
  stats: ['stats'] as const,
  analytics: ['analytics'] as const,
  analyticsOverview: (days: number) => ['analytics', 'overview', days] as const,
  inactiveClients: (days: number) => ['analytics', 'inactive', days] as const,
};
