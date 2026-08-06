<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import http from '@/lib/http';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAdminI18n } from '@/i18n';

type Mapping = {
  id: string;
  type: 'room' | 'placement';
  cmsKey: string;
  cmsLabel: string;
  samoCode: string;
  samoName: string;
  adultCount: number | null;
  childCount: number | null;
  isActive: boolean;
  sortOrder: number;
};

const { t } = useAdminI18n();
const loading = ref(false);
const saving = ref(false);
const mappings = ref<Mapping[]>([]);
const activeType = ref<'room' | 'placement'>('room');
const isDialogOpen = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  type: 'room' as 'room' | 'placement',
  cmsKey: '',
  cmsLabel: '',
  samoCode: '',
  samoName: '',
  adultCount: 1,
  childCount: 0,
  isActive: true,
  sortOrder: 0,
});

const visibleMappings = computed(() => mappings.value.filter((item) => item.type === activeType.value));

const loadMappings = async () => {
  loading.value = true;
  try {
    const { data } = await http.get('/admin/incoming-mappings');
    mappings.value = data;
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('incomingMappings.loadFailed')));
  } finally {
    loading.value = false;
  }
};

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const resetForm = (type = activeType.value) => {
  editingId.value = null;
  form.type = type;
  form.cmsKey = '';
  form.cmsLabel = '';
  form.samoCode = '';
  form.samoName = '';
  form.adultCount = 1;
  form.childCount = 0;
  form.isActive = true;
  form.sortOrder = 0;
};

const openCreateDialog = () => {
  resetForm();
  isDialogOpen.value = true;
};

const openEditDialog = (mapping: Mapping) => {
  editingId.value = mapping.id;
  form.type = mapping.type;
  form.cmsKey = mapping.cmsKey;
  form.cmsLabel = mapping.cmsLabel;
  form.samoCode = mapping.samoCode;
  form.samoName = mapping.samoName;
  form.adultCount = mapping.adultCount ?? 1;
  form.childCount = mapping.childCount ?? 0;
  form.isActive = mapping.isActive;
  form.sortOrder = mapping.sortOrder;
  isDialogOpen.value = true;
};

const saveMapping = async () => {
  if (!form.cmsLabel.trim() || !form.samoCode.trim() || !form.samoName.trim()) {
    ElMessage.warning(t('incomingMappings.required'));
    return;
  }

  saving.value = true;
  const payload = {
    type: form.type,
    cmsKey: form.cmsKey.trim() || normalizeKey(form.cmsLabel),
    cmsLabel: form.cmsLabel.trim(),
    samoCode: form.samoCode.trim(),
    samoName: form.samoName.trim(),
    adultCount: form.type === 'placement' ? Number(form.adultCount) : undefined,
    childCount: form.type === 'placement' ? Number(form.childCount) : undefined,
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder) || 0,
  };

  try {
    if (editingId.value) {
      await http.patch(`/admin/incoming-mappings/${editingId.value}`, payload);
    } else {
      await http.post('/admin/incoming-mappings', payload);
    }
    ElMessage.success(t('common.saved'));
    isDialogOpen.value = false;
    await loadMappings();
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('incomingMappings.saveFailed')));
  } finally {
    saving.value = false;
  }
};

const deleteMapping = async (mapping: Mapping) => {
  await ElMessageBox.confirm(t('incomingMappings.deleteConfirm'), t('common.delete'), {
    type: 'warning',
  });
  await http.delete(`/admin/incoming-mappings/${mapping.id}`);
  ElMessage.success(t('common.saved'));
  await loadMappings();
};

loadMappings();
</script>

<template>
  <div class="incoming-mappings-page">
    <section class="incoming-toolbar">
      <div>
        <h2>{{ t('nav.incomingMappings') }}</h2>
        <p>{{ t('incomingMappings.description') }}</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        {{ t('common.create') }}
      </el-button>
    </section>

    <el-card shadow="never">
      <el-tabs v-model="activeType">
        <el-tab-pane :label="t('incomingMappings.rooms')" name="room" />
        <el-tab-pane :label="t('incomingMappings.placements')" name="placement" />
      </el-tabs>

      <el-table v-loading="loading" :data="visibleMappings" border>
        <el-table-column prop="cmsLabel" :label="t('incomingMappings.cmsValue')" min-width="220" />
        <el-table-column prop="samoCode" :label="t('incomingMappings.samoCode')" width="130" />
        <el-table-column prop="samoName" :label="t('incomingMappings.samoName')" min-width="220" />
        <el-table-column v-if="activeType === 'placement'" prop="adultCount" :label="t('incomingMappings.adults')" width="120" />
        <el-table-column v-if="activeType === 'placement'" prop="childCount" :label="t('incomingMappings.children')" width="120" />
        <el-table-column :label="t('common.status')" width="120">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? t('common.enabled') : t('common.deactivate') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.actions')" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)">
              {{ t('common.edit') }}
            </el-button>
            <el-button size="small" type="danger" plain @click="deleteMapping(row)">
              {{ t('common.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="isDialogOpen" :title="t('incomingMappings.dialogTitle')" width="620px">
      <el-form label-position="top">
        <el-form-item :label="t('incomingMappings.type')">
          <el-select v-model="form.type">
            <el-option :label="t('incomingMappings.rooms')" value="room" />
            <el-option :label="t('incomingMappings.placements')" value="placement" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('incomingMappings.cmsValue')">
          <el-input v-model="form.cmsLabel" placeholder="Standard / 2 adults" />
        </el-form-item>
        <el-form-item :label="t('incomingMappings.cmsKey')">
          <el-input v-model="form.cmsKey" placeholder="standard" />
        </el-form-item>
        <div v-if="form.type === 'placement'" class="mapping-grid">
          <el-form-item :label="t('incomingMappings.adults')">
            <el-input-number v-model="form.adultCount" :min="1" />
          </el-form-item>
          <el-form-item :label="t('incomingMappings.children')">
            <el-input-number v-model="form.childCount" :min="0" />
          </el-form-item>
        </div>
        <div class="mapping-grid">
          <el-form-item :label="t('incomingMappings.samoCode')">
            <el-input v-model="form.samoCode" />
          </el-form-item>
          <el-form-item :label="t('incomingMappings.samoName')">
            <el-input v-model="form.samoName" />
          </el-form-item>
        </div>
        <div class="mapping-grid">
          <el-form-item :label="t('incomingMappings.sortOrder')">
            <el-input-number v-model="form.sortOrder" />
          </el-form-item>
          <el-form-item :label="t('common.enabled')">
            <el-switch v-model="form.isActive" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="isDialogOpen = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="saveMapping">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.incoming-mappings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.incoming-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.incoming-toolbar h2 {
  margin: 0 0 8px;
  font-size: 28px;
}

.incoming-toolbar p {
  margin: 0;
  color: #6b7280;
}

.mapping-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
</style>
