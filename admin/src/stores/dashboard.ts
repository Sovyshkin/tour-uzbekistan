import { defineStore } from 'pinia';
import { ref } from 'vue';

import http from '@/lib/http';

type DashboardResponse = {
  stats: {
    users: number;
    partners: number;
    tours: number;
    services: number;
    news: number;
    leads: number;
    bookings: number;
    newLeads: number;
    pendingBookings: number;
  };
  recentLeads: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    createdAt: string;
  }>;
  recentBookings: Array<{
    id: string;
    bookingNumber: string;
    customer: string;
    status: string;
    createdAt: string;
  }>;
};

export const useDashboardStore = defineStore('dashboard', () => {
  const data = ref<DashboardResponse | null>(null);
  const loading = ref(false);

  const load = async () => {
    loading.value = true;
    try {
      const response = await http.get<DashboardResponse>('/admin/dashboard');
      data.value = response.data;
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    loading,
    load,
  };
});
