import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores/auth';
import AdminLayout from '@/layouts/AdminLayout.vue';
import AdminContentPage from '@/views/AdminContentPage.vue';
import AdminAuditLogsPage from '@/views/AdminAuditLogsPage.vue';
import AdminRecordsPage from '@/views/AdminRecordsPage.vue';
import DashboardPage from '@/views/DashboardPage.vue';
import LoginPage from '@/views/LoginPage.vue';
import SectionPage from '@/views/SectionPage.vue';

const router = createRouter({
  history: createWebHistory(),
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
            title: 'Dashboard',
          },
        },
        {
          path: 'site-content',
          name: 'site-content',
          component: AdminContentPage,
          meta: {
            title: 'Контент сайта',
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
            title: 'Страницы',
            contentTypes: ['pages'],
          },
        },
        {
          path: 'countries',
          name: 'countries',
          component: AdminContentPage,
          meta: {
            title: 'Страны',
            contentTypes: ['countries'],
          },
        },
        {
          path: 'tours',
          name: 'admin-tours',
          component: AdminContentPage,
          meta: {
            title: 'Туры',
            contentTypes: ['tours'],
          },
        },
        {
          path: 'services',
          name: 'admin-services',
          component: AdminContentPage,
          meta: {
            title: 'Услуги',
            contentTypes: ['services'],
          },
        },
        {
          path: 'why-us',
          name: 'why-us',
          component: AdminContentPage,
          meta: {
            title: 'Почему мы',
            contentTypes: ['whyCategories'],
          },
        },
        {
          path: 'news',
          name: 'admin-news',
          component: AdminContentPage,
          meta: {
            title: 'Новости',
            contentTypes: ['news'],
          },
        },
        {
          path: 'leads',
          name: 'admin-leads',
          component: AdminRecordsPage,
          meta: {
            title: 'Заявки',
            recordType: 'leads',
          },
        },
        {
          path: 'bookings',
          name: 'admin-bookings',
          component: AdminRecordsPage,
          meta: {
            title: 'Бронирования',
            recordType: 'bookings',
          },
        },
        {
          path: 'partners',
          name: 'partners',
          component: AdminRecordsPage,
          meta: {
            title: 'Партнеры',
            recordType: 'partners',
          },
        },
        {
          path: 'users',
          name: 'users',
          component: AdminRecordsPage,
          meta: {
            title: 'Пользователи',
            recordType: 'users',
          },
        },
        {
          path: 'media',
          name: 'media',
          component: AdminContentPage,
          meta: {
            title: 'Медиа',
            contentTypes: ['media'],
          },
        },
        {
          path: 'logs',
          name: 'admin-logs',
          component: AdminAuditLogsPage,
          meta: {
            title: 'Логи',
          },
        },
        {
          path: 'settings',
          name: 'settings',
          component: AdminContentPage,
          meta: {
            title: 'Настройки',
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
