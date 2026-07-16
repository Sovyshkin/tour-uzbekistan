<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';

import http from '@/lib/http';
import { getApiErrorMessage } from '@/lib/api-error';
import { useDashboardStore } from '@/stores/dashboard';

type RecordType = 'users' | 'partners' | 'leads' | 'bookings';
type AnyRecord = Record<string, any> & { id: string; title: string };

const route = useRoute();
const dashboardStore = useDashboardStore();
const loading = ref(false);
const savingId = ref('');
const archivingId = ref('');
const bulkProcessing = ref(false);
const creating = ref(false);
const createOpen = ref(false);
const records = ref<AnyRecord[]>([]);
const recordsTableRef = ref();
const selectedRecords = ref<AnyRecord[]>([]);
const createForm = ref<Record<string, any>>({});
const createError = ref('');

const roleLabels: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  CUSTOMER: 'Клиент',
  PARTNER: 'Партнер',
};

const userStatusLabels: Record<string, string> = {
  ACTIVE: 'Активен',
  PENDING: 'Ожидает',
  SUSPENDED: 'Заблокирован',
};

const partnerTypeLabels: Record<string, string> = {
  AGENCY: 'Турагентство',
  OPERATOR: 'Туроператор',
  TRANSPORT: 'Транспорт',
  HOTEL: 'Отель',
  OTHER: 'Другое',
};

const leadStatusLabels: Record<string, string> = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  QUALIFIED: 'Квалифицирована',
  WON: 'Успешная',
  LOST: 'Потеряна',
  SPAM: 'Спам',
};

const bookingStatusLabels: Record<string, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  COMPLETED: 'Завершено',
};

const labelFrom = (labels: Record<string, string>, value: unknown) => {
  const key = String(value ?? '');
  return labels[key] ?? key;
};

const recordType = computed<RecordType>(() => String(route.meta.recordType ?? 'users') as RecordType);

const columns = computed(() => {
  if (recordType.value === 'users') {
    return [
      { prop: 'title', label: 'Имя', minWidth: 180 },
      { prop: 'email', label: 'Email', minWidth: 220 },
      { prop: 'role', label: 'Роль', width: 150, format: (value: unknown) => labelFrom(roleLabels, value) },
      { prop: 'status', label: 'Статус', width: 150, format: (value: unknown) => labelFrom(userStatusLabels, value) },
      { prop: 'partner', label: 'Партнер', minWidth: 180 },
    ];
  }

  if (recordType.value === 'partners') {
    return [
      { prop: 'title', label: 'Название', minWidth: 220 },
      { prop: 'email', label: 'Email', minWidth: 220 },
      { prop: 'phone', label: 'Телефон', minWidth: 160 },
      { prop: 'type', label: 'Тип', width: 170, format: (value: unknown) => labelFrom(partnerTypeLabels, value) },
      { prop: 'city', label: 'Город', width: 140 },
    ];
  }

  if (recordType.value === 'leads') {
    return [
      { prop: 'title', label: 'Имя', minWidth: 180 },
      { prop: 'email', label: 'Email', minWidth: 220 },
      { prop: 'phone', label: 'Телефон', minWidth: 160 },
      { prop: 'status', label: 'Статус', width: 150, format: (value: unknown) => labelFrom(leadStatusLabels, value) },
      { prop: 'sourcePagePath', label: 'Страница', minWidth: 180 },
      { prop: 'tour', label: 'Тур', minWidth: 180 },
    ];
  }

  return [
    { prop: 'title', label: 'Номер', minWidth: 170 },
    { prop: 'customer', label: 'Клиент', minWidth: 180 },
    { prop: 'email', label: 'Email', minWidth: 220 },
    { prop: 'status', label: 'Статус', width: 150, format: (value: unknown) => labelFrom(bookingStatusLabels, value) },
    { prop: 'tour', label: 'Тур', minWidth: 180 },
    { prop: 'totalPrice', label: 'Цена', width: 120 },
  ];
});

const loadRecords = async () => {
  loading.value = true;
  try {
    const response = await http.get<AnyRecord[]>('/admin/records', {
      params: { type: recordType.value },
    });
    records.value = response.data;
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, 'Не удалось загрузить данные'));
  } finally {
    loading.value = false;
  }
};

const canCreate = computed(() => ['users', 'partners'].includes(recordType.value));
const selectedCount = computed(() => selectedRecords.value.length);

const resetSelection = () => {
  selectedRecords.value = [];
  recordsTableRef.value?.clearSelection?.();
};

const handleSelectionChange = (rows: AnyRecord[]) => {
  selectedRecords.value = rows;
};

const openCreate = () => {
  createError.value = '';
  createForm.value =
    recordType.value === 'users'
      ? {
          email: '',
          password: '',
          firstName: '',
          lastName: '',
          phone: '',
          role: 'MANAGER',
          status: 'ACTIVE',
        }
      : {
          slug: '',
          name: '',
          email: '',
          phone: '',
          city: '',
          type: 'AGENCY',
          isActive: true,
        };
  createOpen.value = true;
};

const createRecord = async () => {
  createError.value = '';

  if (recordType.value === 'users' && String(createForm.value.password ?? '').length < 8) {
    createError.value = 'Пароль должен быть не короче 8 символов';
    ElMessage.warning(createError.value);
    return;
  }

  creating.value = true;
  try {
    const response = await http.post<AnyRecord[]>(`/admin/records/${recordType.value}`, createForm.value);
    records.value = response.data;
    createOpen.value = false;
    ElMessage.success('Запись создана');
  } catch (error: any) {
    createError.value = getApiErrorMessage(error, 'Не удалось создать запись');
    ElMessage.error({
      message: createError.value,
      duration: 6000,
      showClose: true,
    });
  } finally {
    creating.value = false;
  }
};

const updateStatus = async (row: AnyRecord, value: string | boolean) => {
  savingId.value = row.id;
  const payload =
    recordType.value === 'users'
      ? { userStatus: value }
      : recordType.value === 'partners'
        ? { isActive: value }
        : recordType.value === 'leads'
          ? { leadStatus: value }
          : { bookingStatus: value };

  try {
    const response = await http.patch<AnyRecord[]>(`/admin/records/${recordType.value}/${row.id}`, payload);
    records.value = response.data;
    if (recordType.value === 'leads' || recordType.value === 'bookings') {
      dashboardStore.load();
    }
    ElMessage.success('Сохранено');
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, 'Не удалось сохранить'));
  } finally {
    savingId.value = '';
  }
};

const bulkUpdate = async (payload: Record<string, unknown>, successMessage: string) => {
  if (!selectedRecords.value.length) {
    return;
  }

  bulkProcessing.value = true;
  try {
    await Promise.all(
      selectedRecords.value.map((row) =>
        http.patch<AnyRecord[]>(`/admin/records/${recordType.value}/${row.id}`, payload),
      ),
    );
    await loadRecords();
    resetSelection();
    if (recordType.value === 'leads' || recordType.value === 'bookings') {
      dashboardStore.load();
    }
    ElMessage.success(successMessage);
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, 'Не удалось выполнить массовое действие'));
  } finally {
    bulkProcessing.value = false;
  }
};

const archiveLabel = computed(() => {
  if (recordType.value === 'partners') {
    return 'Отключить';
  }

  if (recordType.value === 'bookings') {
    return 'Отменить';
  }

  if (recordType.value === 'leads') {
    return 'В спам';
  }

  return 'Заблокировать';
});

const archiveRecord = async (row: AnyRecord) => {
  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите выполнить действие "${archiveLabel.value}" для "${row.title}"?`,
      archiveLabel.value,
      {
        confirmButtonText: archiveLabel.value,
        cancelButtonText: 'Отмена',
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  archivingId.value = row.id;
  try {
    const response = await http.delete<AnyRecord[]>(`/admin/records/${recordType.value}/${row.id}`);
    records.value = response.data;
    if (recordType.value === 'leads' || recordType.value === 'bookings') {
      dashboardStore.load();
    }
    ElMessage.success('Запись обновлена');
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, 'Не удалось выполнить действие'));
  } finally {
    archivingId.value = '';
  }
};

const bulkArchiveRecords = async () => {
  if (!selectedRecords.value.length) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      `Вы уверены, что хотите выполнить действие "${archiveLabel.value}" для ${selectedRecords.value.length} записей?`,
      'Массовое действие',
      {
        confirmButtonText: archiveLabel.value,
        cancelButtonText: 'Отмена',
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  bulkProcessing.value = true;
  try {
    await Promise.all(
      selectedRecords.value.map((row) => http.delete<AnyRecord[]>(`/admin/records/${recordType.value}/${row.id}`)),
    );
    await loadRecords();
    resetSelection();
    if (recordType.value === 'leads' || recordType.value === 'bookings') {
      dashboardStore.load();
    }
    ElMessage.success('Записи обновлены');
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, 'Не удалось выполнить массовое действие'));
  } finally {
    bulkProcessing.value = false;
  }
};

watch(
  () => route.fullPath,
  () => {
    resetSelection();
    loadRecords();
  },
  { immediate: true },
);
</script>

<template>
  <div class="records-page">
    <section class="records-toolbar">
      <div>
        <h2>{{ String(route.meta.title ?? 'Раздел') }}</h2>
        <p>Данные загружаются из PostgreSQL через admin API.</p>
      </div>
      <div class="records-actions">
        <el-button :loading="loading" @click="loadRecords">Обновить</el-button>
        <el-button v-if="canCreate" type="primary" @click="openCreate">Создать</el-button>
        <template v-if="selectedCount > 0">
          <el-tag class="selection-count" type="info">{{ selectedCount }} выбрано</el-tag>

          <template v-if="recordType === 'users'">
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ userStatus: 'ACTIVE' }, 'Пользователи активированы')">
              Активировать
            </el-button>
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ userStatus: 'SUSPENDED' }, 'Пользователи заблокированы')">
              Заблокировать
            </el-button>
          </template>

          <template v-else-if="recordType === 'partners'">
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ isActive: true }, 'Партнеры активированы')">
              Активировать
            </el-button>
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ isActive: false }, 'Партнеры отключены')">
              Отключить
            </el-button>
          </template>

          <template v-else-if="recordType === 'leads'">
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ leadStatus: 'IN_PROGRESS' }, 'Заявки переведены в работу')">
              В работу
            </el-button>
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ leadStatus: 'WON' }, 'Заявки отмечены успешными')">
              Успешные
            </el-button>
          </template>

          <template v-else>
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ bookingStatus: 'CONFIRMED' }, 'Бронирования подтверждены')">
              Подтвердить
            </el-button>
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ bookingStatus: 'CANCELLED' }, 'Бронирования отменены')">
              Отменить
            </el-button>
          </template>

          <el-button type="danger" plain :loading="bulkProcessing" @click="bulkArchiveRecords">
            {{ archiveLabel }}
          </el-button>
          <el-button plain :disabled="bulkProcessing" @click="resetSelection">Снять выбор</el-button>
        </template>
      </div>
    </section>

    <el-card class="records-table-card" shadow="never">
      <el-table
        ref="recordsTableRef"
        v-loading="loading"
        :data="records"
        row-key="id"
        empty-text="Нет данных"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column
          v-for="column in columns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :min-width="column.minWidth"
          :width="column.width"
        >
          <template #default="{ row }">
            {{ column.format ? column.format(row[column.prop]) : row[column.prop] }}
          </template>
        </el-table-column>
        <el-table-column label="Управление" width="300">
          <template #default="{ row }">
            <div class="record-row-actions">
              <el-select
                v-if="recordType === 'users'"
                :model-value="row.status"
                :loading="savingId === row.id"
                size="small"
                @change="(value: string) => updateStatus(row, value)"
              >
                <el-option :label="userStatusLabels.ACTIVE" value="ACTIVE" />
                <el-option :label="userStatusLabels.PENDING" value="PENDING" />
                <el-option :label="userStatusLabels.SUSPENDED" value="SUSPENDED" />
              </el-select>
              <el-switch
                v-else-if="recordType === 'partners'"
                :model-value="row.isActive"
                :loading="savingId === row.id"
                @change="(value: boolean) => updateStatus(row, value)"
              />
              <el-select
                v-else-if="recordType === 'leads'"
                :model-value="row.status"
                :loading="savingId === row.id"
                size="small"
                @change="(value: string) => updateStatus(row, value)"
              >
                <el-option :label="leadStatusLabels.NEW" value="NEW" />
                <el-option :label="leadStatusLabels.IN_PROGRESS" value="IN_PROGRESS" />
                <el-option :label="leadStatusLabels.QUALIFIED" value="QUALIFIED" />
                <el-option :label="leadStatusLabels.WON" value="WON" />
                <el-option :label="leadStatusLabels.LOST" value="LOST" />
                <el-option :label="leadStatusLabels.SPAM" value="SPAM" />
              </el-select>
              <el-select
                v-else
                :model-value="row.status"
                :loading="savingId === row.id"
                size="small"
                @change="(value: string) => updateStatus(row, value)"
              >
                <el-option :label="bookingStatusLabels.PENDING" value="PENDING" />
                <el-option :label="bookingStatusLabels.CONFIRMED" value="CONFIRMED" />
                <el-option :label="bookingStatusLabels.CANCELLED" value="CANCELLED" />
                <el-option :label="bookingStatusLabels.COMPLETED" value="COMPLETED" />
              </el-select>
              <el-button
                type="danger"
                plain
                size="small"
                :loading="archivingId === row.id"
                @click="archiveRecord(row)"
              >
                {{ archiveLabel }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="createOpen"
      width="min(560px, calc(100vw - 24px))"
      :title="recordType === 'users' ? 'Создать пользователя' : 'Создать партнера'"
    >
      <el-form label-position="top">
        <el-alert
          v-if="createError"
          class="dialog-error"
          type="error"
          :title="createError"
          show-icon
          :closable="false"
        />

        <template v-if="recordType === 'users'">
          <el-form-item label="Email">
            <el-input v-model="createForm.email" />
          </el-form-item>
          <el-form-item label="Пароль">
            <el-input v-model="createForm.password" type="password" show-password />
          </el-form-item>
          <div class="dialog-grid">
            <el-form-item label="Имя">
              <el-input v-model="createForm.firstName" />
            </el-form-item>
            <el-form-item label="Фамилия">
              <el-input v-model="createForm.lastName" />
            </el-form-item>
          </div>
          <el-form-item label="Телефон">
            <el-input v-model="createForm.phone" />
          </el-form-item>
          <div class="dialog-grid">
            <el-form-item label="Роль">
              <el-select v-model="createForm.role">
                <el-option :label="roleLabels.ADMIN" value="ADMIN" />
                <el-option :label="roleLabels.MANAGER" value="MANAGER" />
                <el-option :label="roleLabels.CUSTOMER" value="CUSTOMER" />
                <el-option :label="roleLabels.PARTNER" value="PARTNER" />
              </el-select>
            </el-form-item>
            <el-form-item label="Статус">
              <el-select v-model="createForm.status">
                <el-option :label="userStatusLabels.ACTIVE" value="ACTIVE" />
                <el-option :label="userStatusLabels.PENDING" value="PENDING" />
                <el-option :label="userStatusLabels.SUSPENDED" value="SUSPENDED" />
              </el-select>
            </el-form-item>
          </div>
        </template>

        <template v-else>
          <el-form-item label="Название">
            <el-input v-model="createForm.name" />
          </el-form-item>
          <el-form-item label="Slug">
            <el-input v-model="createForm.slug" />
          </el-form-item>
          <div class="dialog-grid">
            <el-form-item label="Email">
              <el-input v-model="createForm.email" />
            </el-form-item>
            <el-form-item label="Телефон">
              <el-input v-model="createForm.phone" />
            </el-form-item>
          </div>
          <div class="dialog-grid">
            <el-form-item label="Город">
              <el-input v-model="createForm.city" />
            </el-form-item>
            <el-form-item label="Тип">
              <el-select v-model="createForm.type">
                <el-option :label="partnerTypeLabels.AGENCY" value="AGENCY" />
                <el-option :label="partnerTypeLabels.OPERATOR" value="OPERATOR" />
                <el-option :label="partnerTypeLabels.TRANSPORT" value="TRANSPORT" />
                <el-option :label="partnerTypeLabels.HOTEL" value="HOTEL" />
                <el-option :label="partnerTypeLabels.OTHER" value="OTHER" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item label="Активен">
            <el-switch v-model="createForm.isActive" />
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="createOpen = false">Отмена</el-button>
        <el-button type="primary" :loading="creating" @click="createRecord">Создать</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.records-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.records-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  min-width: 0;
}

.records-toolbar h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.records-toolbar p {
  margin: 6px 0 0;
  color: #6b7280;
}

.records-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.records-actions .el-button {
  margin-left: 0;
}

.selection-count {
  height: 32px;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.records-table-card {
  min-width: 0;
  max-width: 100%;
}

.records-table-card :deep(.el-card__body) {
  min-width: 0;
  overflow-x: auto;
}

.dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.dialog-error {
  margin-bottom: 16px;
  white-space: pre-line;
}

.record-row-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.record-row-actions .el-select {
  min-width: 150px;
}

.record-row-actions .el-button {
  margin-left: 0;
}

@media (max-width: 720px) {
  .records-toolbar {
    align-items: flex-start;
    flex-direction: column;
    padding: 14px;
  }

  .records-toolbar h2 {
    font-size: 20px;
  }

  .records-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .records-actions .el-button {
    flex: 1;
    min-width: 120px;
    margin-left: 0;
  }

  .selection-count {
    width: 100%;
    justify-content: center;
  }

  .dialog-grid {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .record-row-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .record-row-actions .el-select,
  .record-row-actions .el-button {
    width: 100%;
    min-width: 0;
  }
}
</style>
