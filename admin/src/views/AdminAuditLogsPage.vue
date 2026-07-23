<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import http from '@/lib/http';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAdminI18n } from '@/i18n';

type AuditLog = {
  id: string;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  method?: string | null;
  path?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
  createdAt: string;
};

type AuditResponse = {
  items: AuditLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const loading = ref(false);
const logs = ref<AuditLog[]>([]);
const page = ref(1);
const limit = ref(50);
const total = ref(0);
const actionFilter = ref('');
const entityTypeFilter = ref('');
const userEmailFilter = ref('');
const searchFilter = ref('');
const dateRange = ref<[Date, Date] | null>(null);
const { locale, t } = useAdminI18n();

const actionLabels = computed<Record<string, string>>(() => ({
  LOGIN: t('audit.actions.LOGIN'),
  LOGOUT: t('audit.actions.LOGOUT'),
  CREATE: t('audit.actions.CREATE'),
  UPDATE: t('audit.actions.UPDATE'),
  ARCHIVE: t('audit.actions.ARCHIVE'),
  UPLOAD: t('audit.actions.UPLOAD'),
}));

const actionOptions = computed(() => Object.entries(actionLabels.value).map(([value, label]) => ({
  value,
  label,
})));

const entityTypeOptions = computed(() => [
  { value: 'auth', label: t('audit.entities.auth') },
  { value: 'content:pages', label: t('audit.entities.content:pages') },
  { value: 'content:countries', label: t('audit.entities.content:countries') },
  { value: 'content:tours', label: t('audit.entities.content:tours') },
  { value: 'content:services', label: t('audit.entities.content:services') },
  { value: 'content:whyCategories', label: t('audit.entities.content:whyCategories') },
  { value: 'content:news', label: t('audit.entities.content:news') },
  { value: 'content:media', label: t('audit.entities.content:media') },
  { value: 'content:siteSettings', label: t('audit.entities.content:siteSettings') },
  { value: 'record:users', label: t('audit.entities.record:users') },
  { value: 'record:partners', label: t('audit.entities.record:partners') },
  { value: 'record:leads', label: t('audit.entities.record:leads') },
  { value: 'record:bookings', label: t('audit.entities.record:bookings') },
  { value: 'media', label: t('audit.entities.media') },
]);

const actionTagType = (action: string) => {
  if (action === 'CREATE' || action === 'UPLOAD') {
    return 'success';
  }

  if (action === 'ARCHIVE') {
    return 'warning';
  }

  if (action === 'LOGIN' || action === 'LOGOUT') {
    return 'info';
  }

  return 'primary';
};

const entityTypeLabel = (value: string) =>
  entityTypeOptions.value.find((option) => option.value === value)?.label ?? value;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(locale.value === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));

const formatMetadata = (value: unknown) => {
  if (!value) {
    return '';
  }

  return JSON.stringify(value, null, 2);
};

const getLogParams = () => ({
  page: page.value,
  limit: limit.value,
  ...(actionFilter.value ? { action: actionFilter.value } : {}),
  ...(entityTypeFilter.value ? { entityType: entityTypeFilter.value } : {}),
  ...(userEmailFilter.value ? { userEmail: userEmailFilter.value.trim() } : {}),
  ...(searchFilter.value ? { search: searchFilter.value.trim() } : {}),
  ...(dateRange.value?.[0] ? { dateFrom: dateRange.value[0].toISOString() } : {}),
  ...(dateRange.value?.[1] ? { dateTo: dateRange.value[1].toISOString() } : {}),
});

const loadLogs = async () => {
  loading.value = true;
  try {
    const response = await http.get<AuditResponse>('/admin/audit-logs', {
      params: getLogParams(),
    });
    logs.value = response.data.items;
    total.value = response.data.meta.total;
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('audit.loadFailed')));
  } finally {
    loading.value = false;
  }
};

const applyFilters = () => {
  page.value = 1;
  loadLogs();
};

const resetFilters = () => {
  actionFilter.value = '';
  entityTypeFilter.value = '';
  userEmailFilter.value = '';
  searchFilter.value = '';
  dateRange.value = null;
  applyFilters();
};

const hasDetails = computed(() =>
  logs.value.some((log) => log.metadata || log.path || log.userAgent || log.entityId),
);

watch([page, limit], loadLogs, { immediate: true });
</script>

<template>
  <div class="audit-page">
    <section class="audit-toolbar">
      <div>
        <h2>{{ t('audit.title') }}</h2>
        <p>{{ t('audit.subtitle') }}</p>
      </div>
      <el-button :loading="loading" @click="loadLogs">{{ t('common.refresh') }}</el-button>
    </section>

    <el-card class="audit-filters" shadow="never">
      <div class="filter-grid">
        <el-input
          v-model="searchFilter"
          clearable
          :placeholder="t('audit.searchPlaceholder')"
          @keyup.enter="applyFilters"
        />
        <el-input
          v-model="userEmailFilter"
          clearable
          :placeholder="t('audit.userEmailPlaceholder')"
          @keyup.enter="applyFilters"
        />
        <el-select v-model="actionFilter" clearable :placeholder="t('audit.actionPlaceholder')">
          <el-option
            v-for="option in actionOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select v-model="entityTypeFilter" clearable filterable :placeholder="t('audit.sectionPlaceholder')">
          <el-option
            v-for="option in entityTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="—"
          :start-placeholder="t('audit.dateFrom')"
          :end-placeholder="t('audit.dateTo')"
          format="DD.MM.YYYY HH:mm"
        />
      </div>
      <div class="filter-actions">
        <el-button :loading="loading" type="primary" @click="applyFilters">{{ t('audit.apply') }}</el-button>
        <el-button @click="resetFilters">{{ t('audit.reset') }}</el-button>
      </div>
    </el-card>

    <el-card class="audit-card" shadow="never">
      <el-table v-loading="loading" :data="logs" row-key="id" :empty-text="t('audit.empty')">
        <el-table-column :label="t('common.date')" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.user')" min-width="220">
          <template #default="{ row }">
            <div class="audit-user">
              <strong>{{ row.userEmail || t('common.system') }}</strong>
              <span>{{ row.userRole || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('audit.actionPlaceholder')" width="130">
          <template #default="{ row }">
            <el-tag :type="actionTagType(row.action)">
              {{ actionLabels[row.action] || row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.section')" min-width="170">
          <template #default="{ row }">
            {{ entityTypeLabel(row.entityType) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.object')" min-width="220">
          <template #default="{ row }">
            {{ row.entityTitle || row.entityId || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP" width="150" />
        <el-table-column v-if="hasDetails" type="expand">
          <template #default="{ row }">
            <div class="audit-details">
              <div><strong>{{ t('common.method') }}:</strong> {{ row.method || '-' }}</div>
              <div><strong>{{ t('common.path') }}:</strong> {{ row.path || '-' }}</div>
              <div><strong>{{ t('common.entityId') }}:</strong> {{ row.entityId || '-' }}</div>
              <div><strong>{{ t('audit.userAgent') }}:</strong> {{ row.userAgent || '-' }}</div>
              <pre v-if="row.metadata">{{ formatMetadata(row.metadata) }}</pre>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="audit-pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="limit"
          :total="total"
          :page-sizes="[25, 50, 100]"
          layout="total, sizes, prev, pager, next"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.audit-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.audit-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.audit-toolbar h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
  line-height: 1.2;
}

.audit-toolbar p {
  margin: 6px 0 0;
  color: #6b7280;
}

.audit-card {
  min-width: 0;
}

.audit-filters {
  min-width: 0;
}

.audit-filters :deep(.el-card__body) {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(220px, 1.3fr) minmax(190px, 1fr) minmax(160px, 0.7fr) minmax(190px, 0.9fr) minmax(280px, 1.2fr);
  gap: 12px;
  min-width: 0;
  width: 100%;
}

.filter-grid :deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
}

.filter-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.audit-card :deep(.el-card__body) {
  overflow-x: auto;
}

.audit-user {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.audit-user strong,
.audit-user span {
  overflow-wrap: anywhere;
}

.audit-user span {
  color: #6b7280;
  font-size: 13px;
}

.audit-details {
  display: grid;
  gap: 8px;
  padding: 12px 20px;
  color: #374151;
  line-height: 1.45;
}

.audit-details pre {
  max-width: 100%;
  overflow: auto;
  margin: 4px 0 0;
  padding: 12px;
  border-radius: 8px;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 12px;
}

.audit-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

@media (max-width: 720px) {
  .audit-toolbar {
    align-items: stretch;
    flex-direction: column;
    padding: 14px;
  }

  .audit-toolbar .el-button {
    width: 100%;
    margin-left: 0;
  }

  .audit-filters :deep(.el-card__body) {
    flex-direction: column;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    width: 100%;
  }

  .filter-actions .el-button {
    flex: 1;
    margin-left: 0;
  }

  .audit-pagination {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
