import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import AdminLayout from '@/layouts/AdminLayout.vue';
import AdminContentPage from '@/views/AdminContentPage.vue';
import AdminAuditLogsPage from '@/views/AdminAuditLogsPage.vue';
import AdminIncomingMappingsPage from '@/views/AdminIncomingMappingsPage.vue';
import AdminIncomingSearchPage from '@/views/AdminIncomingSearchPage.vue';
import AdminDepartureCitiesPage from '@/views/AdminDepartureCitiesPage.vue';
import AdminRecordsPage from '@/views/AdminRecordsPage.vue';
import DashboardPage from '@/views/DashboardPage.vue';
import LoginPage from '@/views/LoginPage.vue';
import SectionPage from '@/views/SectionPage.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/',
      component: AdminLayout,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardPage,
          meta: {
            titleKey: 'common.dashboard',
          },
        },
        {
          path: 'site-content',
          name: 'site-content',
          component: AdminContentPage,
          meta: {
            titleKey: 'nav.siteContent',
            contentTypes: ['homeBanners', 'countries', 'tours', 'services', 'whyCategories', 'news'],
          },
        },
        {
          path: 'home-page',
          redirect: { name: 'site-content' },
        },
        {
          path: 'pages',
          name: 'pages',
          component: AdminContentPage,
          meta: {
            titleKey: 'nav.pages',
            contentTypes: ['pages'],
          },
        },
        {
          path: 'countries',
          name: 'countries',
          component: AdminContentPage,
          meta: {
            titleKey: 'nav.countries',
            contentTypes: ['countries'],
          },
        },
        {
          path: 'tours',
          name: 'admin-tours',
          component: AdminContentPage,
          meta: {
            titleKey: 'nav.tours',
            contentTypes: ['tours'],
          },
        },
        {
          path: 'departure-cities',
          name: 'departure-cities',
          component: AdminDepartureCitiesPage,
          meta: {
            titleKey: 'nav.departureCities',
          },
        },
        {
          path: 'services',
          name: 'admin-services',
          component: AdminContentPage,
          meta: {
            titleKey: 'nav.services',
            contentTypes: ['services'],
          },
        },
        {
          path: 'why-us',
          name: 'why-us',
          component: AdminContentPage,
          meta: {
            titleKey: 'nav.whyUs',
            contentTypes: ['whyCategories'],
          },
        },
        {
          path: 'news',
          name: 'admin-news',
          component: AdminContentPage,
          meta: {
            titleKey: 'nav.news',
            contentTypes: ['news'],
          },
        },
        {
          path: 'leads',
          name: 'admin-leads',
          component: AdminRecordsPage,
          meta: {
            titleKey: 'nav.leads',
            recordType: 'leads',
          },
        },
        {
          path: 'bookings',
          name: 'admin-bookings',
          component: AdminRecordsPage,
          meta: {
            titleKey: 'nav.bookings',
            recordType: 'bookings',
          },
        },
        {
          path: 'incoming-search',
          name: 'incoming-search',
          component: AdminIncomingSearchPage,
          meta: {
            titleKey: 'nav.incomingSearch',
          },
        },
        {
          path: 'incoming-mappings',
          name: 'incoming-mappings',
          component: AdminIncomingMappingsPage,
          meta: {
            titleKey: 'nav.incomingMappings',
          },
        },
        {
          path: 'partners',
          name: 'partners',
          component: AdminRecordsPage,
          meta: {
            titleKey: 'nav.partners',
            recordType: 'partners',
          },
        },
        {
          path: 'users',
          name: 'users',
          component: AdminRecordsPage,
          meta: {
            titleKey: 'nav.users',
            recordType: 'users',
          },
        },
        {
          path: 'media',
          name: 'media',
          component: AdminContentPage,
          meta: {
            titleKey: 'nav.media',
            contentTypes: ['media'],
          },
        },
        {
          path: 'logs',
          name: 'admin-logs',
          component: AdminAuditLogsPage,
          meta: {
            titleKey: 'nav.logs',
          },
        },
        {
          path: 'settings',
          name: 'settings',
          component: AdminContentPage,
          meta: {
            titleKey: 'nav.settings',
            contentTypes: ['siteSettings'],
          },
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.initialized) {
    try {
      await authStore.bootstrap();
    } catch {
      authStore.logout();
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' };
  }

  return true;
});

export default router;
