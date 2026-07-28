<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';

import http from '@/lib/http';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAdminI18n } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { useDashboardStore } from '@/stores/dashboard';

type RecordType = 'users' | 'partners' | 'leads' | 'bookings';
type AnyRecord = Record<string, any> & { id: string; title: string };

const route = useRoute();
const authStore = useAuthStore();
const dashboardStore = useDashboardStore();
const { t } = useAdminI18n();
const loading = ref(false);
const savingId = ref('');
const archivingId = ref('');
const bulkProcessing = ref(false);
const creating = ref(false);
const createOpen = ref(false);
const passwordDialogOpen = ref(false);
const passwordSaving = ref(false);
const passwordTarget = ref<AnyRecord | null>(null);
const passwordForm = ref({ password: '' });
const passwordError = ref('');
const records = ref<AnyRecord[]>([]);
const recordsTableRef = ref();
const selectedRecords = ref<AnyRecord[]>([]);
const createForm = ref<Record<string, any>>({});
const createError = ref('');

const roleLabels = computed<Record<string, string>>(() => ({
  ADMIN: t('enums.role.ADMIN'),
  MANAGER: t('enums.role.MANAGER'),
  CUSTOMER: t('enums.role.CUSTOMER'),
  PARTNER: t('enums.role.PARTNER'),
}));

const userStatusLabels = computed<Record<string, string>>(() => ({
  ACTIVE: t('enums.userStatus.ACTIVE'),
  PENDING: t('enums.userStatus.PENDING'),
  SUSPENDED: t('enums.userStatus.SUSPENDED'),
}));

const partnerTypeLabels = computed<Record<string, string>>(() => ({
  AGENCY: t('enums.partnerType.AGENCY'),
  OPERATOR: t('enums.partnerType.OPERATOR'),
  TRANSPORT: t('enums.partnerType.TRANSPORT'),
  HOTEL: t('enums.partnerType.HOTEL'),
  OTHER: t('enums.partnerType.OTHER'),
}));

const leadStatusLabels = computed<Record<string, string>>(() => ({
  NEW: t('enums.leadStatus.NEW'),
  IN_PROGRESS: t('enums.leadStatus.IN_PROGRESS'),
  QUALIFIED: t('enums.leadStatus.QUALIFIED'),
  WON: t('enums.leadStatus.WON'),
  LOST: t('enums.leadStatus.LOST'),
  SPAM: t('enums.leadStatus.SPAM'),
}));

const bookingStatusLabels = computed<Record<string, string>>(() => ({
  PENDING: t('enums.bookingStatus.PENDING'),
  CONFIRMED: t('enums.bookingStatus.CONFIRMED'),
  CANCELLED: t('enums.bookingStatus.CANCELLED'),
  COMPLETED: t('enums.bookingStatus.COMPLETED'),
}));

const labelFrom = (labels: Record<string, string>, value: unknown) => {
  const key = String(value ?? '');
  return labels[key] ?? key;
};

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
};

const formatSourcePage = (row: AnyRecord) =>
  displayValue(row.sourcePageTitle || row.sourcePagePath);

const formatDateTime = (value: unknown) => {
  if (!value) {
    return '—';
  }

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const readSnapshot = (row: AnyRecord) => {
  const snapshot = row.snapshot;
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return {};
  }

  return snapshot as Record<string, any>;
};

const snapshotServices = (row: AnyRecord) => {
  const services = readSnapshot(row).includedServices;
  return Array.isArray(services) ? services.filter((item) => typeof item === 'string') : [];
};

const snapshotProgram = (row: AnyRecord) => {
  const program = readSnapshot(row).program;
  return Array.isArray(program) ? program : [];
};

const recordType = computed<RecordType>(() => String(route.meta.recordType ?? 'users') as RecordType);

const columns = computed(() => {
  if (recordType.value === 'users') {
    return [
      { prop: 'title', label: t('common.name'), minWidth: 180 },
      { prop: 'email', label: t('common.email'), minWidth: 220 },
      { prop: 'role', label: t('common.role'), width: 150, format: (value: unknown) => labelFrom(roleLabels.value, value) },
      { prop: 'status', label: t('common.status'), width: 150, format: (value: unknown) => labelFrom(userStatusLabels.value, value) },
      { prop: 'partner', label: t('common.partner'), minWidth: 180 },
    ];
  }

  if (recordType.value === 'partners') {
    return [
      { prop: 'title', label: t('common.title'), minWidth: 220 },
      { prop: 'email', label: t('common.email'), minWidth: 220 },
      { prop: 'phone', label: t('common.phone'), minWidth: 160 },
      { prop: 'type', label: t('common.type'), width: 170, format: (value: unknown) => labelFrom(partnerTypeLabels.value, value) },
      { prop: 'city', label: t('common.city'), width: 140 },
    ];
  }

  if (recordType.value === 'leads') {
    return [
      { prop: 'title', label: t('common.name'), minWidth: 180 },
      { prop: 'email', label: t('common.email'), minWidth: 220 },
      { prop: 'phone', label: t('common.phone'), minWidth: 160 },
      { prop: 'audience', label: t('common.audience'), width: 110 },
      { prop: 'status', label: t('common.status'), width: 150, format: (value: unknown) => labelFrom(leadStatusLabels.value, value) },
      { prop: 'sourcePagePath', label: t('records.sourcePage'), minWidth: 220, format: (_value: unknown, row: AnyRecord) => formatSourcePage(row) },
      { prop: 'tour', label: t('common.tour'), minWidth: 180 },
    ];
  }

  return [
    { prop: 'title', label: t('dashboard.bookingNumber'), minWidth: 170 },
    { prop: 'customer', label: t('dashboard.customer'), minWidth: 180 },
    { prop: 'email', label: t('common.email'), minWidth: 220 },
    { prop: 'audience', label: t('common.audience'), width: 110 },
    { prop: 'status', label: t('common.status'), width: 150, format: (value: unknown) => labelFrom(bookingStatusLabels.value, value) },
    { prop: 'tour', label: t('common.tour'), minWidth: 180 },
    { prop: 'sourcePagePath', label: t('records.sourcePage'), minWidth: 220 },
    { prop: 'totalPrice', label: t('common.price'), width: 120 },
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
    ElMessage.error(getApiErrorMessage(error, t('records.loadFailed')));
  } finally {
    loading.value = false;
  }
};

const canCreate = computed(() => ['users', 'partners'].includes(recordType.value));
const canManageUserSecurity = computed(() => recordType.value === 'users' && authStore.user?.role === 'ADMIN');
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
    createError.value = t('records.passwordTooShort');
    ElMessage.warning(createError.value);
    return;
  }

  creating.value = true;
  try {
    const response = await http.post<AnyRecord[]>(`/admin/records/${recordType.value}`, createForm.value);
    records.value = response.data;
    createOpen.value = false;
    ElMessage.success(t('records.created'));
  } catch (error: any) {
    createError.value = getApiErrorMessage(error, t('records.createFailed'));
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
    ElMessage.success(t('common.saved'));
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('records.saveFailed')));
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
    ElMessage.error(getApiErrorMessage(error, t('records.bulkActionFailed')));
  } finally {
    bulkProcessing.value = false;
  }
};

const archiveLabel = computed(() => {
  if (recordType.value === 'partners') {
    return t('records.disable');
  }

  if (recordType.value === 'bookings') {
    return t('records.cancelBooking');
  }

  if (recordType.value === 'leads') {
    return t('records.spam');
  }

  return t('records.block');
});

const archiveRecord = async (row: AnyRecord) => {
  try {
    await ElMessageBox.confirm(
      t('records.confirmSingle', { action: archiveLabel.value, title: row.title }),
      archiveLabel.value,
      {
        confirmButtonText: archiveLabel.value,
        cancelButtonText: t('common.cancel'),
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
    ElMessage.success(t('records.updated'));
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('records.actionFailed')));
  } finally {
    archivingId.value = '';
  }
};

const openPasswordDialog = (row: AnyRecord) => {
  passwordTarget.value = row;
  passwordForm.value = { password: '' };
  passwordError.value = '';
  passwordDialogOpen.value = true;
};

const changeUserPassword = async () => {
  if (!passwordTarget.value) {
    return;
  }

  passwordError.value = '';

  if (String(passwordForm.value.password ?? '').length < 8) {
    passwordError.value = t('records.passwordTooShort');
    ElMessage.warning(passwordError.value);
    return;
  }

  passwordSaving.value = true;
  try {
    const response = await http.patch<AnyRecord[]>(
      `/admin/records/users/${passwordTarget.value.id}/password`,
      passwordForm.value,
    );
    records.value = response.data;
    passwordDialogOpen.value = false;
    ElMessage.success(t('records.passwordChanged'));
  } catch (error: any) {
    passwordError.value = getApiErrorMessage(error, t('records.passwordChangeFailed'));
    ElMessage.error({
      message: passwordError.value,
      duration: 6000,
      showClose: true,
    });
  } finally {
    passwordSaving.value = false;
  }
};

const deleteUser = async (row: AnyRecord) => {
  try {
    await ElMessageBox.confirm(
      t('records.deleteUserConfirm', { title: row.title }),
      t('records.deleteUser'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
      },
    );
  } catch {
    return;
  }

  archivingId.value = row.id;
  try {
    const response = await http.delete<AnyRecord[]>(`/admin/records/users/${row.id}/permanent`);
    records.value = response.data;
    ElMessage.success(t('records.userDeleted'));
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('records.userDeleteFailed')));
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
      t('records.confirmBulk', { action: archiveLabel.value, count: selectedRecords.value.length }),
      t('records.bulkAction'),
      {
        confirmButtonText: archiveLabel.value,
        cancelButtonText: t('common.cancel'),
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
    ElMessage.success(t('records.updatedPlural'));
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('records.bulkActionFailed')));
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
        <h2>{{ t(String(route.meta.titleKey ?? 'common.section')) }}</h2>
        <p>{{ t('records.apiNote') }}</p>
      </div>
      <div class="records-actions">
        <el-button :loading="loading" @click="loadRecords">{{ t('common.refresh') }}</el-button>
        <el-button v-if="canCreate" type="primary" @click="openCreate">{{ t('common.create') }}</el-button>
        <template v-if="selectedCount > 0">
          <el-tag class="selection-count" type="info">{{ t('common.selected', { count: selectedCount }) }}</el-tag>

          <template v-if="recordType === 'users'">
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ userStatus: 'ACTIVE' }, t('records.usersActivated'))">
              {{ t('common.activate') }}
            </el-button>
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ userStatus: 'SUSPENDED' }, t('records.usersBlocked'))">
              {{ t('records.block') }}
            </el-button>
          </template>

          <template v-else-if="recordType === 'partners'">
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ isActive: true }, t('records.partnersActivated'))">
              {{ t('common.activate') }}
            </el-button>
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ isActive: false }, t('records.partnersDisabled'))">
              {{ t('common.deactivate') }}
            </el-button>
          </template>

          <template v-else-if="recordType === 'leads'">
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ leadStatus: 'IN_PROGRESS' }, t('records.leadsInProgress'))">
              {{ t('records.markInProgress') }}
            </el-button>
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ leadStatus: 'WON' }, t('records.leadsWon'))">
              {{ t('records.markWon') }}
            </el-button>
          </template>

          <template v-else>
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ bookingStatus: 'CONFIRMED' }, t('records.bookingsConfirmed'))">
              {{ t('records.confirmBooking') }}
            </el-button>
            <el-button plain :loading="bulkProcessing" @click="bulkUpdate({ bookingStatus: 'CANCELLED' }, t('records.bookingsCancelled'))">
              {{ t('records.cancelBooking') }}
            </el-button>
          </template>

          <el-button type="danger" plain :loading="bulkProcessing" @click="bulkArchiveRecords">
            {{ archiveLabel }}
          </el-button>
          <el-button plain :disabled="bulkProcessing" @click="resetSelection">{{ t('common.clearSelection') }}</el-button>
        </template>
      </div>
    </section>

    <el-card class="records-table-card" shadow="never">
      <el-table
        ref="recordsTableRef"
        v-loading="loading"
        :data="records"
        row-key="id"
        :empty-text="t('common.noData')"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column v-if="recordType === 'leads' || recordType === 'bookings'" type="expand" width="48">
          <template #default="{ row }">
            <div class="record-details">
              <div class="detail-card">
                <h3>{{ t('records.sourceStats') }}</h3>
                <dl>
                  <div>
                    <dt>{{ t('records.sourcePage') }}</dt>
                    <dd>{{ displayValue(row.sourcePagePath) }}</dd>
                  </div>
                  <div v-if="row.sourcePageTitle">
                    <dt>{{ t('records.sourcePageTitle') }}</dt>
                    <dd>{{ row.sourcePageTitle }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('common.audience') }}</dt>
                    <dd>{{ displayValue(row.audience) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('common.createdAt') }}</dt>
                    <dd>{{ formatDateTime(row.createdAt) }}</dd>
                  </div>
                </dl>
              </div>

              <div v-if="recordType === 'leads'" class="detail-card">
                <h3>{{ t('records.b2cRequest') }}</h3>
                <dl>
                  <div>
                    <dt>{{ t('common.tour') }}</dt>
                    <dd>{{ displayValue(row.tour) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('common.country') }}</dt>
                    <dd>{{ displayValue(row.country) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('common.service') }}</dt>
                    <dd>{{ displayValue(row.service) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('common.type') }}</dt>
                    <dd>{{ displayValue(row.type) }}</dd>
                  </div>
                </dl>
                <div v-if="row.message" class="detail-message">
                  <span>{{ t('records.message') }}</span>
                  <p>{{ row.message }}</p>
                </div>
              </div>

              <div v-else class="detail-card detail-card-wide">
                <h3>{{ t('records.b2bBooking') }}</h3>
                <dl>
                  <div>
                    <dt>{{ t('common.tour') }}</dt>
                    <dd>{{ displayValue(row.tour || readSnapshot(row).title) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('common.country') }}</dt>
                    <dd>{{ displayValue(row.country) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('common.partner') }}</dt>
                    <dd>{{ displayValue(row.partner) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('records.requestedHotel') }}</dt>
                    <dd>{{ displayValue(row.hotelName || readSnapshot(row).hotels) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('records.transport') }}</dt>
                    <dd>{{ displayValue(readSnapshot(row).transport) }}</dd>
                  </div>
                  <div>
                    <dt>{{ t('common.price') }}</dt>
                    <dd>{{ displayValue([row.totalPrice, row.currency].filter(Boolean).join(' ')) }}</dd>
                  </div>
                </dl>

                <div v-if="snapshotServices(row).length" class="detail-message">
                  <span>{{ t('records.includedServices') }}</span>
                  <div class="detail-tags">
                    <el-tag v-for="service in snapshotServices(row)" :key="service" type="info">
                      {{ service }}
                    </el-tag>
                  </div>
                </div>

                <div v-if="snapshotProgram(row).length" class="detail-message">
                  <span>{{ t('records.tourProgram') }}</span>
                  <ol class="detail-program">
                    <li v-for="day in snapshotProgram(row)" :key="`${row.id}-${day.dayNumber}`">
                      <b>{{ day.dayNumber }}. {{ day.title }}</b>
                      <p>{{ day.description }}</p>
                    </li>
                  </ol>
                </div>

                <div v-if="row.specialRequests" class="detail-message">
                  <span>{{ t('records.specialRequests') }}</span>
                  <p>{{ row.specialRequests }}</p>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          v-for="column in columns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :min-width="column.minWidth"
          :width="column.width"
        >
          <template #default="{ row }">
            {{ column.format ? column.format(row[column.prop], row) : displayValue(row[column.prop]) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('common.management')" width="300">
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
              <template v-if="canManageUserSecurity">
                <el-button
                  type="primary"
                  plain
                  size="small"
                  @click="openPasswordDialog(row)"
                >
                  {{ t('records.changePassword') }}
                </el-button>
                <el-button
                  v-if="row.id !== authStore.user?.id"
                  type="danger"
                  size="small"
                  :loading="archivingId === row.id"
                  @click="deleteUser(row)"
                >
                  {{ t('common.delete') }}
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="createOpen"
      width="min(560px, calc(100vw - 24px))"
      :title="recordType === 'users' ? t('records.createUser') : t('records.createPartner')"
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
          <el-form-item :label="t('login.password')">
            <el-input v-model="createForm.password" type="password" show-password />
          </el-form-item>
          <div class="dialog-grid">
            <el-form-item :label="t('common.firstName')">
              <el-input v-model="createForm.firstName" />
            </el-form-item>
            <el-form-item :label="t('common.lastName')">
              <el-input v-model="createForm.lastName" />
            </el-form-item>
          </div>
          <el-form-item :label="t('common.phone')">
            <el-input v-model="createForm.phone" />
          </el-form-item>
          <div class="dialog-grid">
            <el-form-item :label="t('common.role')">
              <el-select v-model="createForm.role">
                <el-option :label="roleLabels.ADMIN" value="ADMIN" />
                <el-option :label="roleLabels.MANAGER" value="MANAGER" />
                <el-option :label="roleLabels.CUSTOMER" value="CUSTOMER" />
                <el-option :label="roleLabels.PARTNER" value="PARTNER" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('common.status')">
              <el-select v-model="createForm.status">
                <el-option :label="userStatusLabels.ACTIVE" value="ACTIVE" />
                <el-option :label="userStatusLabels.PENDING" value="PENDING" />
                <el-option :label="userStatusLabels.SUSPENDED" value="SUSPENDED" />
              </el-select>
            </el-form-item>
          </div>
        </template>

        <template v-else>
          <el-form-item :label="t('common.title')">
            <el-input v-model="createForm.name" />
          </el-form-item>
          <el-form-item label="Slug">
            <el-input v-model="createForm.slug" />
          </el-form-item>
          <div class="dialog-grid">
            <el-form-item label="Email">
              <el-input v-model="createForm.email" />
            </el-form-item>
            <el-form-item :label="t('common.phone')">
              <el-input v-model="createForm.phone" />
            </el-form-item>
          </div>
          <div class="dialog-grid">
            <el-form-item :label="t('common.city')">
              <el-input v-model="createForm.city" />
            </el-form-item>
            <el-form-item :label="t('common.type')">
              <el-select v-model="createForm.type">
                <el-option :label="partnerTypeLabels.AGENCY" value="AGENCY" />
                <el-option :label="partnerTypeLabels.OPERATOR" value="OPERATOR" />
                <el-option :label="partnerTypeLabels.TRANSPORT" value="TRANSPORT" />
                <el-option :label="partnerTypeLabels.HOTEL" value="HOTEL" />
                <el-option :label="partnerTypeLabels.OTHER" value="OTHER" />
              </el-select>
            </el-form-item>
          </div>
          <el-form-item :label="t('common.enabled')">
            <el-switch v-model="createForm.isActive" />
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="createOpen = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="creating" @click="createRecord">{{ t('common.create') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="passwordDialogOpen"
      width="min(460px, calc(100vw - 24px))"
      :title="t('records.changeUserPassword')"
    >
      <el-form label-position="top">
        <el-alert
          v-if="passwordError"
          class="dialog-error"
          type="error"
          :title="passwordError"
          show-icon
          :closable="false"
        />

        <el-form-item :label="t('common.user')">
          <el-input :model-value="passwordTarget?.title ?? ''" disabled />
        </el-form-item>
        <el-form-item :label="t('records.newPassword')">
          <el-input
            v-model="passwordForm.password"
            type="password"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="passwordDialogOpen = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="passwordSaving" @click="changeUserPassword">
          {{ t('common.save') }}
        </el-button>
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

.record-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 16px 10px;
  background: #f8fafc;
}

.detail-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  min-width: 0;
}

.detail-card-wide {
  grid-column: 1 / -1;
}

.detail-card h3 {
  margin: 0 0 12px;
  font-size: 16px;
  line-height: 1.2;
}

.detail-card dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.detail-card dt {
  margin-bottom: 4px;
  color: #8a9099;
  font-size: 12px;
}

.detail-card dd {
  margin: 0;
  color: #303133;
  font-size: 14px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.detail-message {
  margin-top: 14px;
}

.detail-message > span {
  display: block;
  margin-bottom: 8px;
  color: #8a9099;
  font-size: 12px;
}

.detail-message p {
  margin: 0;
  color: #303133;
  line-height: 1.6;
  white-space: pre-wrap;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-program {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 20px;
}

.detail-program p {
  margin-top: 4px;
  color: #606266;
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

  .record-details,
  .detail-card dl {
    grid-template-columns: 1fr;
  }
}
</style>
