<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import http from '@/lib/http';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAdminI18n } from '@/i18n';

type DepartureCity = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

const { t } = useAdminI18n();
const loading = ref(false);
const saving = ref(false);
const cities = ref<DepartureCity[]>([]);
const isDialogOpen = ref(false);
const editingId = ref<string | null>(null);

const form = reactive({
  name: '',
  isActive: true,
  sortOrder: 0,
});

const resetForm = () => {
  editingId.value = null;
  form.name = '';
  form.isActive = true;
  form.sortOrder = 0;
};

const loadCities = async () => {
  loading.value = true;
  try {
    const { data } = await http.get<DepartureCity[]>('/admin/departure-cities');
    cities.value = data;
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('departureCities.loadFailed')));
  } finally {
    loading.value = false;
  }
};

const openCreateDialog = () => {
  resetForm();
  isDialogOpen.value = true;
};

const openEditDialog = (city: DepartureCity) => {
  editingId.value = city.id;
  form.name = city.name;
  form.isActive = city.isActive;
  form.sortOrder = city.sortOrder;
  isDialogOpen.value = true;
};

const saveCity = async () => {
  if (!form.name.trim()) {
    ElMessage.warning(t('departureCities.nameRequired'));
    return;
  }

  saving.value = true;
  const payload = {
    name: form.name.trim(),
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder) || 0,
  };

  try {
    if (editingId.value) {
      await http.patch(`/admin/departure-cities/${editingId.value}`, payload);
    } else {
      await http.post('/admin/departure-cities', payload);
    }
    ElMessage.success(t('common.saved'));
    isDialogOpen.value = false;
    await loadCities();
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error, t('departureCities.saveFailed')));
  } finally {
    saving.value = false;
  }
};

const deleteCity = async (city: DepartureCity) => {
  await ElMessageBox.confirm(t('departureCities.deleteConfirm'), t('common.delete'), {
    type: 'warning',
  });
  await http.delete(`/admin/departure-cities/${city.id}`);
  ElMessage.success(t('common.saved'));
  await loadCities();
};

loadCities();
</script>

<template>
  <div class="departure-cities-page">
    <section class="departure-cities-toolbar">
      <p>{{ t('departureCities.description') }}</p>
      <el-button type="primary" @click="openCreateDialog">
        {{ t('common.create') }}
      </el-button>
    </section>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="cities" border>
        <el-table-column prop="name" :label="t('departureCities.name')" min-width="220" />
        <el-table-column prop="sortOrder" :label="t('departureCities.sortOrder')" width="140" />
        <el-table-column :label="t('common.status')" width="140">
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
            <el-button size="small" type="danger" plain @click="deleteCity(row)">
              {{ t('common.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="isDialogOpen" :title="t('departureCities.dialogTitle')" width="520px">
      <el-form label-position="top">
        <el-form-item :label="t('departureCities.name')">
          <el-input v-model="form.name" placeholder="Москва" />
        </el-form-item>
        <div class="departure-cities-grid">
          <el-form-item :label="t('departureCities.sortOrder')">
            <el-input-number v-model="form.sortOrder" />
          </el-form-item>
          <el-form-item :label="t('common.enabled')">
            <el-switch v-model="form.isActive" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="isDialogOpen = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="saveCity">{{ t('common.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.departure-cities-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.departure-cities-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.departure-cities-toolbar p {
  margin: 0;
  color: #667085;
  max-width: 760px;
}

.departure-cities-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
</style>
