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
  checkIn: '',
  nights: 3,
  adults: 2,
  children: 0,
  currency: 'USD',
  tourId: '',
  hotelCode: '',
  city: '',
  extraParams: '',
});

const formattedHotels = computed(() =>
  result.value?.hotels?.parsed
    ? JSON.stringify(result.value.hotels.parsed, null, 2)
    : result.value?.hotels?.raw || '',
);

const formattedMinPrice = computed(() =>
  result.value?.minPriceDetails?.parsed
    ? JSON.stringify(result.value.minPriceDetails.parsed, null, 2)
    : result.value?.minPriceDetails?.raw || '',
);

const search = async () => {
  loading.value = true;
  try {
    const response = await http.post('/admin/incoming-search/search', form);
    result.value = response.data;

    if (response.data?.ok === false) {
      ElMessage.warning(response.data.skippedReason || 'Incoming search skipped');
      return;
    }

    ElMessage.success('Incoming search completed');
  } catch (error: any) {
    ElMessage.error({
      message: getApiErrorMessage(error, 'Incoming search failed'),
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
        <p>Тестовый поиск SAMO Incoming: wizard/getHotels -> wizard/getMinPrice.</p>
      </div>
      <el-button type="primary" :loading="loading" @click="search">
        Запустить поиск
      </el-button>
    </section>

    <el-card shadow="never">
      <el-form label-position="top" class="incoming-form">
        <el-form-item label="Дата заезда">
          <el-date-picker
            v-model="form.checkIn"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="Ночей">
          <el-input-number v-model="form.nights" :min="1" :max="60" class="w-full" />
        </el-form-item>
        <el-form-item label="Взрослых">
          <el-input-number v-model="form.adults" :min="1" :max="20" class="w-full" />
        </el-form-item>
        <el-form-item label="Детей">
          <el-input-number v-model="form.children" :min="0" :max="10" class="w-full" />
        </el-form-item>
        <el-form-item label="Валюта">
          <el-input v-model="form.currency" placeholder="USD" />
        </el-form-item>
        <el-form-item label="Tour ID">
          <el-input v-model="form.tourId" placeholder="Если требуется SAMO" />
        </el-form-item>
        <el-form-item label="Hotel code / ID">
          <el-input v-model="form.hotelCode" placeholder="incomingHotelCode" />
        </el-form-item>
        <el-form-item label="Город / направление">
          <el-input v-model="form.city" placeholder="Если требуется SAMO" />
        </el-form-item>
        <el-form-item class="incoming-form-wide" label="Дополнительные параметры SAMO JSON">
          <el-input
            v-model="form.extraParams"
            type="textarea"
            :rows="5"
            placeholder='{"STATEINC":"1","TOWNFROMINC":"1"}'
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
          <dt>Минимальная цена</dt>
          <dd>{{ result.summary?.minPrice ?? 'Не найдена' }}</dd>
        </div>
        <div>
          <dt>sGUID</dt>
          <dd>{{ result.summary?.sGuid ?? 'Не найден' }}</dd>
        </div>
        <div>
          <dt>getHotels status</dt>
          <dd>{{ result.hotels?.status ?? '-' }}</dd>
        </div>
        <div>
          <dt>getMinPrice status</dt>
          <dd>{{ result.minPriceDetails?.status ?? '-' }}</dd>
        </div>
      </dl>

      <el-tabs>
        <el-tab-pane label="Запрос">
          <pre>{{ JSON.stringify(result.request || result.config, null, 2) }}</pre>
        </el-tab-pane>
        <el-tab-pane label="getHotels">
          <pre>{{ formattedHotels }}</pre>
        </el-tab-pane>
        <el-tab-pane label="getMinPrice">
          <pre>{{ formattedMinPrice || 'getMinPrice не вызывался: sGUID не найден в getHotels.' }}</pre>
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
