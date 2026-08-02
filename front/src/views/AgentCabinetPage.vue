<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AppContainer from '@/components/AppContainer.vue';
import { getAuth, getMyBookings, isApprovedPartnerAuth, refreshTokens } from '@/api';
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
const defaultManagerPhone = '+998(77) 290-08-80';
const managerPhone = computed(() => user.value.managerPhone || defaultManagerPhone);
const managerPhoneHref = computed(() => `tel:${managerPhone.value.replace(/[^\d+]/g, '')}`);
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

const syncAuthState = async () => {
  const storedAuth = getAuth();

  if (!storedAuth?.refreshToken) {
    auth.value = storedAuth;
    return;
  }

  const refreshedAuth = await refreshTokens(storedAuth.refreshToken).catch(() => null);
  auth.value = refreshedAuth || getAuth();
};

const loadBookings = async () => {
  loading.value = true;

  try {
    await syncAuthState();

    if (!isApproved.value) {
      bookings.value = [];
      return;
    }

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
        <a class="quick-card" :href="managerPhoneHref">
          <span>{{ t('agentCabinet.manager') }}</span>
          <strong>{{ managerPhone }}</strong>
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
  background: #fff;
  min-height: 70vh;
  padding: 64px 0 92px;
  font-family: 'Aeonik Pro', sans-serif;
}

.cabinet-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
  gap: 28px;
  align-items: stretch;
  margin-bottom: 28px;
}

.hero-copy,
.account-card,
.quick-card,
.summary-card,
.latest-panel,
.history-section {
  border: 1px solid #d9d9df;
  border-radius: 18px;
  background: #fff;
}

.hero-copy {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  justify-content: center;
  padding: clamp(28px, 4vw, 56px);
}

.cabinet-kicker {
  margin: 0 0 18px;
  color: #285aff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h1 {
  max-width: 680px;
  margin: 0;
  color: #050505;
  font-size: clamp(36px, 5vw, 58px);
  line-height: 1;
  font-weight: 500;
  letter-spacing: 0;
}

.hero-copy p:last-child {
  max-width: 620px;
  margin: 22px 0 0;
  color: #67676d;
  font-size: 20px;
  line-height: 1.4;
}

.account-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 34px;
}

.account-card.approved {
  border-color: #d9d9df;
  background: #fff;
}

.account-card span,
.quick-card span,
.latest-panel span,
.summary-card span,
.booking-number span,
.booking-cell span,
.detail-grid span {
  display: block;
  color: #7a7a80;
  font-size: 14px;
}

.account-card strong {
  display: block;
  margin-top: 18px;
  color: #050505;
  font-size: 32px;
  line-height: 1.1;
  font-weight: 500;
}

.account-card p {
  margin: 18px 0 0;
  color: #5f5f66;
  font-size: 17px;
  line-height: 1.45;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 26px;
}

.quick-card {
  display: block;
  min-height: 118px;
  padding: 24px 26px;
  color: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.quick-card:hover {
  transform: translateY(-1px);
  border-color: #050505;
}

.quick-card:disabled {
  cursor: wait;
  opacity: 0.7;
}

.quick-card strong {
  display: block;
  margin-top: 14px;
  color: #050505;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 500;
}

.quick-card-primary {
  border-color: #ff00e7;
  background: #ff00e7;
}

.quick-card-primary span,
.quick-card-primary strong {
  color: #fff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 26px;
}

.summary-card {
  min-height: 108px;
  padding: 20px 22px;
  position: relative;
  overflow: hidden;
}

.summary-card strong {
  display: block;
  margin-top: 20px;
  color: #050505;
  font-size: 42px;
  line-height: 1;
  font-weight: 500;
}

.summary-total {
  background: #050505;
  border-color: #050505;
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
  margin-bottom: 26px;
  padding: 24px 28px;
}

.latest-panel strong {
  display: block;
  margin-top: 8px;
  color: #050505;
  font-size: 24px;
  font-weight: 500;
}

.latest-panel p {
  margin: 6px 0 0;
  color: #666;
}

.history-section {
  overflow: hidden;
}

.history-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 32px;
  border-bottom: 1px solid #e2e2e7;
}

.history-title-row h2 {
  margin: 0;
  color: #050505;
  font-size: 34px;
  font-weight: 500;
  line-height: 1.1;
}

.history-title-row p {
  margin: 10px 0 0;
  color: #666;
  font-size: 17px;
}

.refresh-btn {
  border: 1px solid #050505;
  background: #fff;
  border-radius: 10px;
  padding: 13px 24px;
  color: #050505;
  font-size: 15px;
  cursor: pointer;
  transition: 0.2s ease;
}

.refresh-btn:hover {
  background: #050505;
  color: #fff;
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
  color: #050505;
  font-size: 26px;
  font-weight: 500;
}

.state-panel.empty p {
  max-width: 520px;
  margin: 0;
  color: #666;
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
  border-top: 1px solid #e2e2e7;
}

.booking-main {
  width: 100%;
  display: grid;
  grid-template-columns: 1.05fr 0.9fr 1.2fr 1.4fr 1.15fr 1fr 20px;
  gap: 16px;
  align-items: center;
  border: 0;
  background: #fff;
  padding: 22px 32px;
  text-align: left;
  cursor: pointer;
}

.booking-main:hover {
  background: #fafafa;
}

.booking-number strong,
.booking-cell strong,
.detail-grid strong {
  color: #050505;
  font-size: 16px;
  font-weight: 500;
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
  border-radius: 10px;
  padding: 5px 11px;
  font-size: 13px;
  border: 1px solid currentColor;
  background: #fff;
}

.status-pending.status-pill,
.status-pending.summary-card {
  color: #9c6500;
  border-color: #ffe2a8;
}

.status-confirmed.status-pill,
.status-confirmed.summary-card {
  color: #087443;
  border-color: #c7f5d8;
}

.status-completed.status-pill,
.status-completed.summary-card {
  color: #285aff;
  border-color: #d6e3ff;
}

.status-cancelled.status-pill,
.status-cancelled.summary-card {
  color: #c82727;
  border-color: #ffd0d0;
}

.incoming-sent {
  color: #087443;
}

.incoming-warning {
  color: #9c6500;
}

.incoming-muted {
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
  padding: 0 32px 32px;
  background: #fff;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding-top: 18px;
}

.detail-grid > div,
.detail-block {
  border: 1px solid #e2e2e7;
  border-radius: 14px;
  background: #fff;
  padding: 18px;
}

.detail-block {
  margin-top: 12px;
}

.detail-block h3 {
  margin: 0 0 12px;
  color: #050505;
  font-size: 18px;
  font-weight: 500;
}

.detail-block p {
  margin: 0;
  color: #555;
  line-height: 1.55;
}

.detail-block small {
  display: block;
  margin-top: 8px;
  color: #6e7788;
}

.incoming-block {
  border-color: #d9d9df;
}

.service-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.service-tags span {
  border: 1px solid #d9d9df;
  border-radius: 10px;
  padding: 7px 10px;
  color: #050505;
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
  color: #050505;
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
    padding: 28px 0 64px;
  }

  .hero-copy h1 {
    font-size: 34px;
  }

  .hero-copy p:last-child,
  .history-title-row p,
  .account-card p {
    font-size: 15px;
  }

  .account-card strong,
  .history-title-row h2 {
    font-size: 26px;
  }

  .quick-card strong {
    font-size: 20px;
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
    padding: 18px;
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
    padding: 0 18px 22px;
  }
}
</style>
