import { createRouter, createWebHistory } from 'vue-router';
import { isAuthenticated, isPartnerAuthenticated } from '@/api';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/AppMain.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutPage.vue'),
    },
    {
      path: '/directions',
      name: 'directions',
      component: () => import('@/views/DirectionsPage.vue'),
    },
    {
      path: '/services',
      name: 'services',
      component: () => import('@/views/ServicesPage.vue'),
    },
    {
      path: '/why-we',
      name: 'whyWe',
      component: () => import('@/views/WhyWePage.vue'),
    },
    {
      path: '/tours',
      name: 'tours',
      component: () => import('@/views/ToursPage.vue'),
    },
    {
      path: '/news',
      name: 'news',
      component: () => import('@/views/NewsPage.vue'),
    },
    {
      path: '/news/:id',
      name: 'news-detail',
      component: () => import('@/views/NewsDetail.vue'),
    },
    {
      path: '/tours/:id',
      name: 'ToursDetail',
      component: () => import('@/views/OpenCard.vue'),
    },
    {
      path: '/services/:id',
      name: 'ServicesDetail',
      component: () => import('@/views/ServicesDetail.vue'),
    },
    {
      path: '/booking/:id',
      name: 'Booking',
      component: () => import('@/views/BookingPage.vue'),
      meta: {
        requiresAuth: true,
      },
    },
    {
      path: '/for-agent',
      name: 'for-agent',
      component: () => import('@/views/ForAgentPage.vue'),
    },
    {
      path: '/agent-cabinet',
      name: 'agent-cabinet',
      component: () => import('@/views/AgentCabinetPage.vue'),
      meta: {
        requiresPartner: true,
      },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/RegisterPage.vue'),
    },
    {
      path: '/faq',
      name: 'faq',
      component: () => import('@/views/GenericPage.vue'),
      meta: {
        pageSlug: 'faq',
      },
    },
    {
      path: '/privacy-policy',
      name: 'privacy-policy',
      component: () => import('@/views/GenericPage.vue'),
      meta: {
        pageSlug: 'privacy-policy',
      },
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('@/views/GenericPage.vue'),
      meta: {
        pageSlug: 'terms',
      },
    },
    // Для стран (динамический маршрут)
    {
      path: '/countries/:country',
      name: 'country',
      component: () => import('@/views/CountryPage.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'maintenance',
      component: () => import('@/views/TechnicalWorkPage.vue'),
    },
  ],
  // ✅ Добавленный scrollBehavior для автоматического скролла вверх
  scrollBehavior(to, from, savedPosition) {
    // Если есть сохраненная позиция (при нажатии "назад"/"вперед")
    if (savedPosition) {
      return savedPosition;
    }
    // Иначе скроллим наверх
    return { top: 0, behavior: 'smooth' };
  },
});

router.beforeEach((to) => {
  if (to.meta.requiresPartner && !isPartnerAuthenticated()) {
    return {
      name: 'home',
      query: {
        auth: 'login',
        reason: 'unauthorized',
        redirect: to.fullPath,
      },
    };
  }

  if (to.meta.requiresAuth && !isAuthenticated()) {
    return {
      name: 'home',
      query: {
        auth: 'login',
        reason: 'unauthorized',
        redirect: to.fullPath,
      },
    };
  }

  return true;
});

export default router;
