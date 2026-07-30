<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppContainer from '@/components/AppContainer.vue';
import { getAuth, getMyBookings, isApprovedPartnerAuth } from '@/api';
import { useNotifications } from '@/composables/useNotifications';

const { t, locale } = useI18n();
const router = useRouter();
const { error: notifyError } = useNotifications();

const auth = ref(getAuth());
const bookings = ref([]);
const loading = ref(false);
const expandedId = ref(null);

const statusOrder = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
const statusClass = {
  PENDING: 'status-pending',
  CONFIRMED: 'status-confirmed',
  COMPLETED: 'status-completed',
  CANCELLED: 'status-cancelled',
};

const user = computed(() => auth.value?.user || {});
const isApproved = computed(() => isApprovedPartnerAuth(auth.value));
const accountStatus = computed(() =>
  isApproved.value ? t('agentCabinet.accountActive') : t('agentCabinet.accountPending'),
);
const accountStatusText = computed(() =>
  isApproved.value ? t('agentCabinet.accountActiveText') : t('agentCabinet.accountPendingText'),
);

const statusLabel = (status) => t(`agentCabinet.statuses.${status}`) || status;

const summary = computed(() => {
  const counts = {
    total: bookings.value.length,
    PENDING: 0,
    CONFIRMED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  bookings.value.forEach((booking) => {
    if (counts[booking.status] !== undefined) {
      counts[booking.status] += 1;
    }
  });

  return counts;
});

const latestBooking = computed(() => bookings.value[0] || null);

const formatDate = (value) => {
  if (!value) {
    return t('agentCabinet.noData');
  }

  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const formatPrice = (booking) => {
  const price = booking.snapshot?.price;
  const currency = booking.snapshot?.currency;
  return price ? `${price}${currency ? ` ${currency}` : ''}` : t('agentCabinet.noData');
};

const customerName = (booking) =>
  [booking.firstName, booking.lastName].filter(Boolean).join(' ') || booking.email;

const integrationLabel = (booking) => {
  const integration = booking.integration;

  if (!integration) {
    return t('agentCabinet.integrationNoData');
  }

  if (integration.sent) {
    return integration.claimNumber
      ? `${t('agentCabinet.integrationSent')} #${integration.claimNumber}`
      : t('agentCabinet.integrationSent');
  }

  return integration.enabled
    ? t('agentCabinet.integrationNotSent')
    : t('agentCabinet.integrationSkipped');
};

const integrationClass = (booking) => {
  if (booking.integration?.sent) {
    return 'incoming-sent';
  }

  return booking.integration?.enabled ? 'incoming-warning' : 'incoming-muted';
};

const toggleDetails = (id) => {
  expandedId.value = expandedId.value === id ? null : id;
};

const goToTours = () => {
  router.push('/tours');
};

const loadBookings = async () => {
  loading.value = true;
  auth.value = getAuth();

  try {
    bookings.value = await getMyBookings();
  } catch (error) {
    if (isApproved.value) {
      notifyError(error.message || t('agentCabinet.loadFailed'), t('agentCabinet.title'));
    }

    bookings.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(loadBookings);
</script>

<template>
  <section class="agent-cabinet">
    <AppContainer>
      <div class="cabinet-hero">
        <div class="hero-copy">
          <p class="cabinet-kicker">B2B</p>
          <h1>{{ t('agentCabinet.title') }}</h1>
          <p>{{ t('agentCabinet.subtitle') }}</p>
        </div>

        <div class="account-card" :class="{ approved: isApproved }">
          <span>{{ t('agentCabinet.account') }}</span>
          <strong>{{ accountStatus }}</strong>
          <p>{{ accountStatusText }}</p>
        </div>
      </div>

      <div class="quick-grid">
        <button type="button" class="quick-card quick-card-primary" @click="goToTours">
          <span>{{ t('agentCabinet.quickTours') }}</span>
          <strong>{{ t('agentCabinet.quickToursText') }}</strong>
        </button>
        <a class="quick-card" href="tel:+998772900880">
          <span>{{ t('agentCabinet.manager') }}</span>
          <strong>+998(77) 290-08-80</strong>
        </a>
        <button type="button" class="quick-card" :disabled="loading" @click="loadBookings">
          <span>{{ t('agentCabinet.refresh') }}</span>
          <strong>{{ t('agentCabinet.refreshText') }}</strong>
        </button>
      </div>

      <div class="summary-grid">
        <article class="summary-card summary-total">
          <span>{{ t('agentCabinet.total') }}</span>
          <strong>{{ summary.total }}</strong>
        </article>
        <article
          v-for="status in statusOrder"
          :key="status"
          class="summary-card"
          :class="statusClass[status]"
        >
          <span>{{ statusLabel(status) }}</span>
          <strong>{{ summary[status] }}</strong>
        </article>
      </div>

      <div v-if="latestBooking" class="latest-panel">
        <div>
          <span>{{ t('agentCabinet.latestRequest') }}</span>
          <strong>{{ latestBooking.bookingNumber }}</strong>
          <p>{{ latestBooking.snapshot?.title || t('agentCabinet.noData') }}</p>
        </div>
        <b class="status-pill" :class="statusClass[latestBooking.status]">
          {{ statusLabel(latestBooking.status) }}
        </b>
      </div>

      <div class="history-section">
        <div class="history-title-row">
          <div>
            <h2>{{ t('agentCabinet.bookingHistory') }}</h2>
            <p>{{ t('agentCabinet.bookingHistoryText') }}</p>
          </div>
          <button type="button" class="refresh-btn" :disabled="loading" @click="loadBookings">
            {{ t('agentCabinet.refresh') }}
          </button>
        </div>

        <div v-if="loading" class="state-panel">
          <div class="loader"></div>
        </div>

        <div v-else-if="!bookings.length" class="state-panel empty">
          <h3>{{ t('agentCabinet.emptyTitle') }}</h3>
          <p>{{ isApproved ? t('agentCabinet.emptyText') : t('agentCabinet.pendingEmptyText') }}</p>
        </div>

        <div v-else class="booking-list">
          <article v-for="booking in bookings" :key="booking.id" class="booking-card">
            <button type="button" class="booking-main" @click="toggleDetails(booking.id)">
              <div class="booking-number">
                <span>{{ t('agentCabinet.bookingNumber') }}</span>
                <strong>{{ booking.bookingNumber }}</strong>
              </div>
              <div class="booking-cell">
                <span>{{ t('agentCabinet.status') }}</span>
                <b class="status-pill" :class="statusClass[booking.status]">
                  {{ statusLabel(booking.status) }}
                </b>
              </div>
              <div class="booking-cell">
                <span>{{ t('agentCabinet.customer') }}</span>
                <strong>{{ customerName(booking) }}</strong>
                <small>{{ booking.email }}</small>
              </div>
              <div class="booking-cell">
                <span>{{ t('agentCabinet.tour') }}</span>
                <strong>{{ booking.snapshot?.title || t('agentCabinet.noData') }}</strong>
              </div>
              <div class="booking-cell">
                <span>Incoming</span>
                <strong class="incoming-pill" :class="integrationClass(booking)">
                  {{ integrationLabel(booking) }}
                </strong>
              </div>
              <div class="booking-cell">
                <span>{{ t('agentCabinet.createdAt') }}</span>
                <strong>{{ formatDate(booking.createdAt) }}</strong>
              </div>
              <svg
                class="expand-icon"
                :class="{ open: expandedId === booking.id }"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div v-if="expandedId === booking.id" class="booking-details">
              <div class="detail-grid">
                <div>
                  <span>{{ t('agentCabinet.price') }}</span>
                  <strong>{{ formatPrice(booking) }}</strong>
                </div>
                <div>
                  <span>{{ t('agentCabinet.transport') }}</span>
                  <strong>{{ booking.snapshot?.transport || t('agentCabinet.noData') }}</strong>
                </div>
                <div>
                  <span>{{ t('agentCabinet.hotels') }}</span>
                  <strong>{{ booking.snapshot?.hotels || t('agentCabinet.noData') }}</strong>
                </div>
                <div>
                  <span>{{ t('agentCabinet.sourcePage') }}</span>
                  <strong>{{ booking.sourcePage || t('agentCabinet.noData') }}</strong>
                </div>
              </div>

              <div class="detail-block incoming-block">
                <h3>Incoming / SAMO</h3>
                <p>{{ integrationLabel(booking) }}</p>
                <small v-if="booking.integration?.message || booking.integration?.skippedReason">
                  {{ booking.integration.message || booking.integration.skippedReason }}
                </small>
              </div>

              <div v-if="booking.specialRequests" class="detail-block">
                <h3>{{ t('agentCabinet.specialRequests') }}</h3>
                <p>{{ booking.specialRequests }}</p>
              </div>

              <div class="detail-block">
                <h3>{{ t('agentCabinet.includedServices') }}</h3>
                <div v-if="booking.snapshot?.includedServices?.length" class="service-tags">
                  <span v-for="service in booking.snapshot.includedServices" :key="service">
                    {{ service }}
                  </span>
                </div>
                <p v-else>{{ t('agentCabinet.noData') }}</p>
              </div>

              <div class="detail-block">
                <h3>{{ t('agentCabinet.program') }}</h3>
                <ol v-if="booking.snapshot?.program?.length" class="program-list">
                  <li v-for="day in booking.snapshot.program" :key="`${booking.id}-${day.dayNumber}`">
                    <span>{{ String(day.dayNumber).padStart(2, '0') }}</span>
                    <div>
                      <strong>{{ day.title }}</strong>
                      <p>{{ day.description }}</p>
                    </div>
                  </li>
                </ol>
                <p v-else>{{ t('agentCabinet.noData') }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </AppContainer>
  </section>
</template>

<style scoped>
.agent-cabinet {
  background: #f5f7fb;
  min-height: 70vh;
  padding: 28px 0 76px;
  font-family: 'Aeonik Pro', sans-serif;
}

.cabinet-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  align-items: stretch;
  margin-bottom: 18px;
}

.hero-copy,
.account-card,
.quick-card,
.summary-card,
.latest-panel,
.history-section {
  border: 1px solid #e1e6ef;
  border-radius: 8px;
  background: #fff;
}

.hero-copy {
  padding: clamp(24px, 4vw, 42px);
  background:
    linear-gradient(135deg, rgba(40, 90, 255, 0.1), transparent 42%),
    #fff;
}

.cabinet-kicker {
  margin: 0 0 10px;
  color: #285aff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.hero-copy h1 {
  max-width: 760px;
  margin: 0;
  color: #070914;
  font-size: clamp(36px, 5vw, 64px);
  line-height: 0.96;
  font-weight: 700;
}

.hero-copy p:last-child {
  max-width: 650px;
  margin: 16px 0 0;
  color: #616979;
  font-size: 17px;
  line-height: 1.45;
}

.account-card {
  padding: 28px;
  border-color: #ffe0f5;
  background: linear-gradient(160deg, #fff 0%, #fff5fc 100%);
}

.account-card.approved {
  border-color: #ccf2db;
  background: linear-gradient(160deg, #fff 0%, #f0fff6 100%);
}

.account-card span,
.quick-card span,
.latest-panel span,
.summary-card span,
.booking-number span,
.booking-cell span,
.detail-grid span {
  display: block;
  color: #687184;
  font-size: 13px;
}

.account-card strong {
  display: block;
  margin-top: 14px;
  color: #090b14;
  font-size: 28px;
  line-height: 1.1;
}

.account-card p {
  margin: 14px 0 0;
  color: #586173;
  line-height: 1.5;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.quick-card {
  display: block;
  min-height: 106px;
  padding: 20px;
  color: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: 0.2s ease;
}

.quick-card:hover {
  transform: translateY(-2px);
  border-color: #285aff;
}

.quick-card:disabled {
  cursor: wait;
  opacity: 0.7;
}

.quick-card strong {
  display: block;
  margin-top: 12px;
  color: #101522;
  font-size: 19px;
  line-height: 1.25;
}

.quick-card-primary {
  border-color: #285aff;
  background: #285aff;
}

.quick-card-primary span,
.quick-card-primary strong {
  color: #fff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.summary-card {
  min-height: 118px;
  padding: 18px;
}

.summary-card strong {
  display: block;
  margin-top: 18px;
  color: #090b14;
  font-size: 38px;
  line-height: 1;
}

.summary-total {
  background: #090b14;
  border-color: #090b14;
}

.summary-total span,
.summary-total strong {
  color: #fff;
}

.latest-panel {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
  padding: 20px 24px;
}

.latest-panel strong {
  display: block;
  margin-top: 8px;
  color: #101522;
  font-size: 24px;
}

.latest-panel p {
  margin: 6px 0 0;
  color: #626b7e;
}

.history-section {
  overflow: hidden;
}

.history-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 24px;
  border-bottom: 1px solid #e6ebf3;
}

.history-title-row h2 {
  margin: 0;
  color: #0d1220;
  font-size: 24px;
}

.history-title-row p {
  margin: 6px 0 0;
  color: #687184;
}

.refresh-btn {
  border: 1px solid #cdd5e4;
  background: #fff;
  border-radius: 8px;
  padding: 12px 18px;
  color: #101522;
  font-size: 15px;
  cursor: pointer;
  transition: 0.2s ease;
}

.refresh-btn:hover {
  border-color: #285aff;
  color: #285aff;
}

.state-panel {
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 30px;
  text-align: center;
}

.state-panel.empty h3 {
  margin: 0 0 8px;
  font-size: 24px;
}

.state-panel.empty p {
  max-width: 520px;
  margin: 0;
  color: #687184;
}

.loader {
  width: 34px;
  height: 34px;
  border: 3px solid #e7ecf5;
  border-top-color: #285aff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.booking-list {
  display: flex;
  flex-direction: column;
}

.booking-card + .booking-card {
  border-top: 1px solid #e6ebf3;
}

.booking-main {
  width: 100%;
  display: grid;
  grid-template-columns: 1.05fr 0.9fr 1.2fr 1.4fr 1.15fr 1fr 20px;
  gap: 16px;
  align-items: center;
  border: 0;
  background: #fff;
  padding: 18px 24px;
  text-align: left;
  cursor: pointer;
}

.booking-main:hover {
  background: #f8faff;
}

.booking-number strong,
.booking-cell strong,
.detail-grid strong {
  color: #111522;
  font-size: 15px;
}

.booking-cell small {
  display: block;
  margin-top: 4px;
  color: #737b8b;
  font-size: 12px;
}

.status-pill,
.incoming-pill {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 28px;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 13px;
}

.status-pending.status-pill,
.status-pending.summary-card {
  background: #fff7e8;
  color: #9c6500;
  border-color: #ffe2a8;
}

.status-confirmed.status-pill,
.status-confirmed.summary-card {
  background: #ecfdf3;
  color: #087443;
  border-color: #c7f5d8;
}

.status-completed.status-pill,
.status-completed.summary-card {
  background: #eef4ff;
  color: #285aff;
  border-color: #d6e3ff;
}

.status-cancelled.status-pill,
.status-cancelled.summary-card {
  background: #fff0f0;
  color: #c82727;
  border-color: #ffd0d0;
}

.incoming-sent {
  background: #ecfdf3;
  color: #087443;
}

.incoming-warning {
  background: #fff7e8;
  color: #9c6500;
}

.incoming-muted {
  background: #eef1f6;
  color: #6e7788;
}

.expand-icon {
  color: #747d8d;
  transition: transform 0.2s ease;
}

.expand-icon.open {
  transform: rotate(180deg);
}

.booking-details {
  padding: 0 24px 24px;
  background: #fbfcff;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding-top: 18px;
}

.detail-grid > div,
.detail-block {
  border: 1px solid #e2e8f2;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.detail-block {
  margin-top: 12px;
}

.detail-block h3 {
  margin: 0 0 12px;
  color: #111522;
  font-size: 16px;
}

.detail-block p {
  margin: 0;
  color: #485064;
  line-height: 1.55;
}

.detail-block small {
  display: block;
  margin-top: 8px;
  color: #6e7788;
}

.incoming-block {
  border-color: #dce6ff;
}

.service-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.service-tags span {
  border: 1px solid #d8e0ee;
  border-radius: 999px;
  padding: 7px 10px;
  color: #283044;
  font-size: 13px;
}

.program-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.program-list li {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
}

.program-list li > span {
  color: #285aff;
  font-size: 20px;
  font-weight: 700;
}

.program-list strong {
  display: block;
  margin-bottom: 5px;
  color: #111522;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1180px) {
  .cabinet-hero,
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .booking-main {
    grid-template-columns: repeat(2, minmax(0, 1fr)) 20px;
  }

  .detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .agent-cabinet {
    padding-top: 16px;
  }

  .hero-copy h1 {
    font-size: 38px;
  }

  .summary-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .summary-card {
    min-height: auto;
  }

  .latest-panel,
  .history-title-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .booking-main {
    grid-template-columns: 1fr 20px;
    gap: 12px;
    padding: 16px;
  }

  .booking-number,
  .booking-cell {
    grid-column: 1;
  }

  .expand-icon {
    grid-column: 2;
    grid-row: 1;
    align-self: start;
  }

  .booking-details {
    padding: 0 16px 18px;
  }
}
</style>
