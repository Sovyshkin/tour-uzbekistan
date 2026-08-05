<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import http from '@/lib/http';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAdminI18n } from '@/i18n';

const { t } = useAdminI18n();
const loading = ref(false);
const result = ref<Record<string, any> | null>(null);

const form = reactive({
  referenceType: 'hotel',
  extraParams: '',
});

const formattedItems = computed(() =>
  result.value?.reference?.items
    ? JSON.stringify(result.value.reference.items.slice(0, 100), null, 2)
    : '',
);

const formattedRaw = computed(() => result.value?.reference?.raw || '');

const search = async () => {
  loading.value = true;
  try {
    const response = await http.post('/admin/incoming-search/search', form);
    result.value = response.data;

    if (response.data?.ok === false) {
      ElMessage.warning(response.data.skippedReason || 'Incoming search skipped');
      return;
    }

    ElMessage.success('XMLGate request completed');
  } catch (error: any) {
    ElMessage.error({
      message: getApiErrorMessage(error, 'XMLGate request failed'),
      duration: 7000,
      showClose: true,
    });
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="incoming-search-page">
    <section class="incoming-toolbar">
      <div>
        <h2>{{ t('nav.incomingSearch') }}</h2>
        <p>Диагностика SAMO XMLGate: export/default.php?samo_action=reference.</p>
      </div>
      <el-button type="primary" :loading="loading" @click="search">
        Выполнить XMLGate запрос
      </el-button>
    </section>

    <el-card shadow="never">
      <el-form label-position="top" class="incoming-form">
        <el-form-item label="Тип справочника">
          <el-select v-model="form.referenceType" class="w-full" filterable allow-create>
            <el-option label="hotel" value="hotel" />
            <el-option label="town" value="town" />
            <el-option label="tour" value="tour" />
            <el-option label="state" value="state" />
            <el-option label="star" value="star" />
            <el-option label="meal" value="meal" />
            <el-option label="room" value="room" />
          </el-select>
        </el-form-item>
        <el-form-item class="incoming-form-wide" label="Дополнительные параметры SAMO JSON">
          <el-input
            v-model="form.extraParams"
            type="textarea"
            :rows="5"
            placeholder='{"laststamp":"0x0000000000000000","delstamp":"0x0000000000000000"}'
          />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="result" shadow="never" class="incoming-result-card">
      <template #header>
        <div class="incoming-result-header">
          <strong>Результат</strong>
          <el-tag :type="result.ok ? 'success' : 'warning'">
            {{ result.ok ? 'OK' : 'SKIPPED' }}
          </el-tag>
        </div>
      </template>

      <div v-if="result.skippedReason" class="incoming-warning">
        {{ result.skippedReason }}
      </div>

      <dl class="incoming-summary">
        <div>
          <dt>Тип</dt>
          <dd>{{ result.summary?.referenceType ?? '-' }}</dd>
        </div>
        <div>
          <dt>Записей</dt>
          <dd>{{ result.summary?.count ?? 0 }}</dd>
        </div>
        <div>
          <dt>HTTP status</dt>
          <dd>{{ result.reference?.status ?? '-' }}</dd>
        </div>
        <div>
          <dt>AES key</dt>
          <dd>{{ result.config?.hasAesKey ? 'Задан' : 'Не задан' }}</dd>
        </div>
      </dl>

      <el-tabs>
        <el-tab-pane label="Запрос">
          <pre>{{ JSON.stringify(result.request || result.config, null, 2) }}</pre>
        </el-tab-pane>
        <el-tab-pane label="Записи">
          <pre>{{ formattedItems }}</pre>
        </el-tab-pane>
        <el-tab-pane label="Raw XML">
          <pre>{{ formattedRaw }}</pre>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.incoming-search-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.incoming-toolbar,
.incoming-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.incoming-toolbar h2 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 28px;
}

.incoming-toolbar p {
  margin: 0;
  color: #6b7280;
}

.incoming-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.incoming-form-wide {
  grid-column: 1 / -1;
}

.incoming-result-card {
  overflow: hidden;
}

.incoming-warning {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
}

.incoming-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0 0 18px;
}

.incoming-summary div {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.incoming-summary dt {
  color: #6b7280;
  font-size: 12px;
}

.incoming-summary dd {
  margin: 6px 0 0;
  color: #111827;
  font-weight: 700;
  word-break: break-word;
}

pre {
  max-height: 420px;
  margin: 0;
  overflow: auto;
  padding: 14px;
  border-radius: 8px;
  background: #111827;
  color: #e5e7eb;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 1100px) {
  .incoming-form,
  .incoming-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .incoming-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .incoming-form,
  .incoming-summary {
    grid-template-columns: 1fr;
  }
}
</style>
