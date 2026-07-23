<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

import { getApiErrorMessage } from '@/lib/api-error';
import { useAdminI18n } from '@/i18n';
import { useDashboardStore } from '@/stores/dashboard';

const dashboardStore = useDashboardStore();
const { t } = useAdminI18n();

const statCards = computed(() => {
  if (!dashboardStore.data) {
    return [];
  }

  const stats = dashboardStore.data.stats;
  return [
    { label: t('dashboard.users'), value: stats.users },
    { label: t('dashboard.partners'), value: stats.partners },
    { label: t('dashboard.tours'), value: stats.tours },
    { label: t('dashboard.services'), value: stats.services },
    { label: t('dashboard.news'), value: stats.news },
    { label: t('dashboard.leads'), value: stats.leads },
    { label: t('dashboard.bookings'), value: stats.bookings },
  ];
});

onMounted(async () => {
  try {
    await dashboardStore.load();
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('dashboard.loadFailed')));
  }
});
</script>

<template>
  <div class="dashboard-grid">
    <section class="stat-grid">
      <el-card v-for="card in statCards" :key="card.label" shadow="never">
        <div class="stat-label">{{ card.label }}</div>
        <div class="stat-value">{{ card.value }}</div>
      </el-card>
    </section>

    <section class="tables-grid">
      <el-card class="dashboard-table-card" shadow="never">
        <template #header>
          <div class="card-header">{{ t('dashboard.recentLeads') }}</div>
        </template>

        <el-table :data="dashboardStore.data?.recentLeads ?? []" :empty-text="t('common.noData')">
          <el-table-column prop="name" :label="t('common.name')" min-width="160" />
          <el-table-column prop="email" :label="t('common.email')" min-width="220" />
          <el-table-column prop="status" :label="t('common.status')" width="140" />
          <el-table-column prop="createdAt" :label="t('common.createdAt')" min-width="180" />
        </el-table>
      </el-card>

      <el-card class="dashboard-table-card" shadow="never">
        <template #header>
          <div class="card-header">{{ t('dashboard.recentBookings') }}</div>
        </template>

        <el-table :data="dashboardStore.data?.recentBookings ?? []" :empty-text="t('common.noData')">
          <el-table-column prop="bookingNumber" :label="t('dashboard.bookingNumber')" min-width="170" />
          <el-table-column prop="customer" :label="t('dashboard.customer')" min-width="180" />
          <el-table-column prop="status" :label="t('common.status')" width="140" />
          <el-table-column prop="createdAt" :label="t('common.createdAt')" min-width="180" />
        </el-table>
      </el-card>
    </section>
  </div>
</template>

<style scoped>
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-label {
  color: #6b7280;
  font-size: 13px;
}

.stat-value {
  margin-top: 10px;
  font-size: 28px;
  font-weight: 700;
}

.tables-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  min-width: 0;
}

.dashboard-table-card {
  min-width: 0;
  max-width: 100%;
}

.dashboard-table-card :deep(.el-card__body) {
  min-width: 0;
  overflow-x: auto;
}

.card-header {
  font-weight: 600;
}

@media (max-width: 1080px) {
  .tables-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-grid {
    gap: 14px;
  }

  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .stat-label {
    font-size: 12px;
  }

  .stat-value {
    font-size: 24px;
  }
}

@media (max-width: 420px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
</style>
