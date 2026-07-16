<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Bell,
  DataAnalysis,
  Document,
  Files,
  Flag,
  Menu,
  Memo,
  Picture,
  Reading,
  Setting,
  Suitcase,
  Tickets,
  User,
  UserFilled,
} from '@element-plus/icons-vue';

import { useAuthStore } from '@/stores/auth';
import { useDashboardStore } from '@/stores/dashboard';
import http from '@/lib/http';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const dashboardStore = useDashboardStore();
const isMobileMenuOpen = ref(false);
let dashboardRefreshTimer: number | null = null;

const menuItems = [
  { label: 'Dashboard', icon: DataAnalysis, routeName: 'dashboard' },
  { label: 'Контент сайта', icon: Files, routeName: 'site-content' },
  { label: 'Страницы', icon: Memo, routeName: 'pages' },
  { label: 'Страны', icon: Flag, routeName: 'countries' },
  { label: 'Туры', icon: Suitcase, routeName: 'admin-tours' },
  { label: 'Услуги', icon: Tickets, routeName: 'admin-services' },
  { label: 'Почему мы', icon: Bell, routeName: 'why-us' },
  { label: 'Новости', icon: Reading, routeName: 'admin-news' },
  { label: 'Заявки', icon: Memo, routeName: 'admin-leads' },
  { label: 'Бронирования', icon: Tickets, routeName: 'admin-bookings' },
  { label: 'Партнеры', icon: UserFilled, routeName: 'partners' },
  { label: 'Пользователи', icon: User, routeName: 'users' },
  { label: 'Медиа', icon: Picture, routeName: 'media' },
  { label: 'Логи', icon: Document, routeName: 'admin-logs' },
  { label: 'Настройки', icon: Setting, routeName: 'settings' },
];

const breadcrumbs = computed(() => [
  { label: 'Админ-панель' },
  { label: String(route.meta.title ?? 'Dashboard') },
]);

const getMenuBadge = (routeName: string) => {
  if (routeName === 'admin-leads') {
    return dashboardStore.data?.stats.newLeads ?? 0;
  }

  if (routeName === 'admin-bookings') {
    return dashboardStore.data?.stats.pendingBookings ?? 0;
  }

  return 0;
};

const refreshDashboardCounters = async () => {
  try {
    await dashboardStore.load();
  } catch {
    // Counters are supportive UI; auth errors are handled by the HTTP interceptor.
  }
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
};

const handleLogout = async () => {
  try {
    await http.post('/admin/audit-logs/events', {
      action: 'LOGOUT',
      entityType: 'auth',
      entityTitle: authStore.user?.email ?? authStore.user?.displayName ?? 'Logout',
    });
  } catch {
    // Logout must work even if audit logging is temporarily unavailable.
  }

  authStore.logout();
  ElMessage.success('Вы вышли из админ-панели');
  router.push({ name: 'login' });
};

watch(
  () => route.fullPath,
  () => {
    closeMobileMenu();
  },
);

onMounted(() => {
  refreshDashboardCounters();
  dashboardRefreshTimer = window.setInterval(refreshDashboardCounters, 30000);
});

onBeforeUnmount(() => {
  if (dashboardRefreshTimer) {
    window.clearInterval(dashboardRefreshTimer);
  }
});
</script>

<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="brand-block">
        <div class="brand-title">Centrum Holidays</div>
        <div class="brand-subtitle">Admin Panel</div>
      </div>

      <nav class="menu-list">
        <RouterLink
          v-for="item in menuItems"
          :key="item.label"
          :to="{ name: item.routeName }"
          class="menu-item"
          :class="{ active: route.name === item.routeName }"
        >
          <component :is="item.icon" class="menu-icon" />
          <span class="menu-label">{{ item.label }}</span>
          <span v-if="getMenuBadge(item.routeName) > 0" class="menu-badge">
            {{ getMenuBadge(item.routeName) > 99 ? '99+' : getMenuBadge(item.routeName) }}
          </span>
        </RouterLink>
      </nav>
    </aside>

    <transition name="admin-overlay-fade">
      <div
        v-if="isMobileMenuOpen"
        class="mobile-sidebar-overlay"
        @click="closeMobileMenu"
      />
    </transition>

    <transition name="admin-drawer-slide">
      <aside v-if="isMobileMenuOpen" class="mobile-sidebar">
        <div class="mobile-sidebar-top">
          <div class="brand-block">
            <div class="brand-title">Centrum Holidays</div>
            <div class="brand-subtitle">Admin Panel</div>
          </div>
          <el-button text @click="closeMobileMenu">Закрыть</el-button>
        </div>

        <nav class="menu-list">
          <RouterLink
            v-for="item in menuItems"
            :key="`mobile-${item.label}`"
            :to="{ name: item.routeName }"
            class="menu-item"
            :class="{ active: route.name === item.routeName }"
            @click="closeMobileMenu"
          >
            <component :is="item.icon" class="menu-icon" />
            <span class="menu-label">{{ item.label }}</span>
            <span v-if="getMenuBadge(item.routeName) > 0" class="menu-badge">
              {{ getMenuBadge(item.routeName) > 99 ? '99+' : getMenuBadge(item.routeName) }}
            </span>
          </RouterLink>
        </nav>
      </aside>
    </transition>

    <main class="admin-main">
      <header class="admin-header">
        <div class="header-main">
          <el-button class="mobile-menu-button" circle @click="isMobileMenuOpen = true">
            <el-icon><Menu /></el-icon>
          </el-button>

          <div>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="crumb in breadcrumbs"
              :key="crumb.label"
            >
              {{ crumb.label }}
            </el-breadcrumb-item>
          </el-breadcrumb>
          <h1 class="page-title">{{ route.meta.title ?? 'Dashboard' }}</h1>
          </div>
        </div>

        <div class="header-actions">
          <div class="user-box">
            <div class="user-name">{{ authStore.user?.displayName }}</div>
            <div class="user-role">{{ authStore.user?.role }}</div>
          </div>
          <el-button type="danger" plain @click="handleLogout">Logout</el-button>
        </div>
      </header>

      <section v-if="authStore.forbiddenMessage" class="forbidden-banner">
        <el-alert
          :title="authStore.forbiddenMessage"
          type="error"
          show-icon
          @close="authStore.forbiddenMessage = ''"
        />
      </section>

      <div class="admin-content">
        <RouterView :key="route.fullPath" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 270px 1fr;
  min-height: 100vh;
  min-width: 0;
}

.admin-sidebar {
  background: #111827;
  color: #f9fafb;
  padding: 20px 16px;
}

.brand-block {
  padding: 14px 12px 24px;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
}

.brand-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #e5e7eb;
}

.menu-label {
  min-width: 0;
  flex: 1;
}

.menu-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: #ef4444;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 0 0 2px rgba(17, 24, 39, 0.95);
}

.menu-item.active,
.menu-item:hover {
  background: #1f2937;
  color: #ffffff;
}

.menu-icon {
  width: 18px;
  height: 18px;
}

.admin-main {
  padding: 24px;
  min-width: 0;
  overflow: hidden;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.header-main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.header-main > div {
  min-width: 0;
}

.page-title {
  margin: 12px 0 0;
  font-size: 28px;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.user-box {
  min-width: 160px;
  text-align: right;
}

.user-name {
  font-weight: 600;
}

.user-role {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.forbidden-banner {
  margin-bottom: 16px;
}

.admin-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.mobile-menu-button,
.mobile-sidebar,
.mobile-sidebar-overlay {
  display: none;
}

@media (max-width: 1080px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    display: none;
  }

  .mobile-menu-button,
  .mobile-sidebar,
  .mobile-sidebar-overlay {
    display: block;
  }

  .mobile-menu-button {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .mobile-sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.42);
    z-index: 39;
  }

  .mobile-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(320px, calc(100vw - 32px));
    background: #111827;
    color: #f9fafb;
    padding: 16px;
    z-index: 40;
    overflow-y: auto;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.35);
  }

  .mobile-sidebar-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .admin-main {
    padding: 16px;
  }

  .admin-header {
    align-items: flex-start;
  }

  .header-actions {
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .user-box {
    min-width: 0;
  }
}

@media (max-width: 720px) {
  .admin-main {
    padding: 12px;
  }

  .admin-header {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 14px;
  }

  .header-main {
    width: 100%;
  }

  .page-title {
    margin-top: 8px;
    font-size: 23px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }

  .user-box {
    text-align: left;
    max-width: calc(100vw - 130px);
  }

  .user-name {
    overflow-wrap: anywhere;
  }

  .mobile-menu-button {
    width: 38px;
    height: 38px;
  }
}

.admin-overlay-fade-enter-active,
.admin-overlay-fade-leave-active {
  transition: opacity 0.2s ease;
}

.admin-overlay-fade-enter-from,
.admin-overlay-fade-leave-to {
  opacity: 0;
}

.admin-drawer-slide-enter-active,
.admin-drawer-slide-leave-active {
  transition: transform 0.24s ease, opacity 0.24s ease;
}

.admin-drawer-slide-enter-from,
.admin-drawer-slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
