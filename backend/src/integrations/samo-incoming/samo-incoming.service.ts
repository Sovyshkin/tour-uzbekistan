import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createHash } from 'crypto';

type SamoClaimPerson = {
  firstName: string;
  lastName: string;
  sex?: string | null;
  birthDate?: Date | null;
  documentSeries?: string | null;
  documentNumber?: string | null;
};

type SamoClaimTour = {
  title: string;
  durationDays: number;
  price?: string | null;
  currency?: string | null;
  transport?: string | null;
  hotels?: string | null;
  includedServices: string[];
};

type SamoClaimSource = {
  audience?: string | null;
  pagePath?: string | null;
  pageTitle?: string | null;
};

type SamoClaimLinkedEntity = {
  type?: string | null;
  id?: string | null;
  slug?: string | null;
  title?: string | null;
};

type SamoIncomingSourceMetadata = {
  audience: string | null;
  pagePath: string | null;
  pageTitle: string | null;
  entityType: string | null;
  entityId: string | null;
  entitySlug: string | null;
  entityTitle: string | null;
};

type SamoIncomingTargetMetadata = {
  tourId: string | null;
  hotelCode: string | null;
  hotelName: string;
  roomCode: string;
  roomName: string;
  htplaceCode: string;
  htplaceName: string;
  mealCode: string;
  mealName: string;
};

export type SamoClaimPayload = {
  bookingId: string;
  bookingNumber: string;
  createdAt: Date;
  travelDate?: Date | null;
  groupSize?: number | null;
  hotelName?: string | null;
  incomingTourId?: string | null;
  incomingHotelCode?: string | null;
  incomingHotelName?: string | null;
  specialRequests?: string | null;
  person: SamoClaimPerson;
  tour: SamoClaimTour;
  source?: SamoClaimSource;
  linkedEntity?: SamoClaimLinkedEntity;
};

export type SamoIncomingResult = {
  enabled: boolean;
  sent: boolean;
  skippedReason?: string;
  claimNumber?: number;
  confirmStatus?: string;
  result?: number;
  comment?: string;
  message?: string;
  rawResponse?: string;
  requestXml?: string;
  source?: SamoIncomingSourceMetadata;
  target?: SamoIncomingTargetMetadata;
};

type SamoIncomingConfig = {
  enabled: boolean;
  endpoint?: string;
  form: string;
  action: string;
  method: string;
  type: string;
  payloadParam: string;
  user?: string;
  password?: string;
  aesKey?: string;
  tourId?: string;
  hotelCode?: string;
  hotelName: string;
  roomCode: string;
  roomName: string;
  htplaceCode: string;
  htplaceName: string;
  mealCode: string;
  mealName: string;
  nights: number;
  timeoutMs: number;
};

@Injectable()
export class SamoIncomingService {
  private readonly logger = new Logger(SamoIncomingService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendBooking(payload: SamoClaimPayload): Promise<SamoIncomingResult> {
    const config = this.getConfig(payload);
    const source = this.buildSourceMetadata(payload);
    const target = this.buildTargetMetadata(config);

    if (!config.enabled) {
      return {
        enabled: false,
        sent: false,
        skippedReason: 'SAMO Incoming integration is disabled',
        source,
        target,
      };
    }

    const missing = this.getMissingConfig(config);
    if (missing.length > 0) {
      return {
        enabled: true,
        sent: false,
        skippedReason: `SAMO Incoming config is incomplete: ${missing.join(', ')}`,
        source,
        target,
      };
    }

    const claimNumber = this.buildClaimNumber(payload.bookingNumber, payload.createdAt);
    let requestXml = '';

    try {
      const partnerToken = await this.getPartnerToken(config);
      const initXml = await this.initReservation(config, payload, partnerToken);
      requestXml = this.buildReservationXml(config, payload, initXml);
      const response = await this.sendXmlGateRequest(config, requestXml, partnerToken);
      return {
        enabled: true,
        sent: true,
        claimNumber,
        requestXml,
        rawResponse: response,
        source,
        target,
        ...this.parseResponse(response),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`SAMO Incoming booking sync failed: ${message}`);
      return {
        enabled: true,
        sent: false,
        claimNumber,
        requestXml,
        message,
        source,
        target,
      };
    }
  }

  private getConfig(payload?: SamoClaimPayload): SamoIncomingConfig {
    const rawBookAction = this.getFirstConfig(
      'SAMO_XMLGATE_BOOK_ACTION',
      'SAMO_INCOMING_XMLGATE_ACTION',
    );
    const rawPayloadParam = this.getFirstConfig(
      'SAMO_XMLGATE_BOOK_PAYLOAD_PARAM',
      'SAMO_INCOMING_XMLGATE_PAYLOAD_PARAM',
    );

    return {
      enabled: this.isEnabled('SAMO_INCOMING_ENABLED', 'SAMO_ENABLED'),
      endpoint: this.getFirstConfig(
        'SAMO_XMLGATE_ENDPOINT',
        'SAMO_INCOMING_XMLGATE_ENDPOINT',
        'SAMO_INCOMING_ENDPOINT',
        'SAMO_BASE_URL',
      ),
      form:
        this.getFirstConfig('SAMO_XMLGATE_FORM', 'SAMO_INCOMING_FORM') ??
        'http://samo.travel',
      action: rawBookAction === 'claimlist' ? 'reference' : rawBookAction ?? 'reference',
      method:
        this.getFirstConfig('SAMO_XMLGATE_BOOK_METHOD', 'SAMO_INCOMING_XMLGATE_METHOD') ??
        'POST',
      type:
        this.getFirstConfig('SAMO_XMLGATE_BOOK_TYPE', 'SAMO_INCOMING_XMLGATE_TYPE') ??
        'bron',
      payloadParam:
        rawPayloadParam === 'claimlist' ? 'claim' : rawPayloadParam ?? 'claim',
      user: this.getFirstConfig('SAMO_XMLGATE_USER', 'SAMO_INCOMING_USER', 'SAMO_USERNAME'),
      password: this.getFirstConfig(
        'SAMO_XMLGATE_PASSWORD',
        'SAMO_INCOMING_PASSWORD',
        'SAMO_PASSWORD',
      ),
      aesKey: this.getFirstConfig('SAMO_XMLGATE_AES_KEY', 'SAMO_AES_KEY'),
      tourId: undefined,
      hotelCode:
        payload?.incomingHotelCode ??
        this.configService.get<string>('SAMO_INCOMING_HOTEL_CODE'),
      hotelName:
        payload?.incomingHotelName ??
        this.configService.get<string>('SAMO_INCOMING_HOTEL_NAME') ??
        'Replicated hotel',
      roomCode: this.configService.get<string>('SAMO_INCOMING_ROOM_CODE') ?? '1',
      roomName:
        this.configService.get<string>('SAMO_INCOMING_ROOM_NAME') ??
        'Standard room',
      htplaceCode: this.configService.get<string>('SAMO_INCOMING_HTPLACE_CODE') ?? '1',
      htplaceName:
        this.configService.get<string>('SAMO_INCOMING_HTPLACE_NAME') ??
        '1 Adult',
      mealCode: this.configService.get<string>('SAMO_INCOMING_MEAL_CODE') ?? '1',
      mealName: this.configService.get<string>('SAMO_INCOMING_MEAL_NAME') ?? 'RO',
      nights: Math.max(1, Number(this.configService.get<string>('SAMO_INCOMING_NIGHTS') ?? 1)),
      timeoutMs: Number(
        this.configService.get<string>('SAMO_INCOMING_TIMEOUT_MS') ?? 15000,
      ),
    };
  }

  private getFirstConfig(...keys: string[]) {
    for (const key of keys) {
      const value = this.configService.get<string>(key);
      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private isEnabled(...keys: string[]) {
    return keys.some((key) => this.configService.get<string>(key) === 'true');
  }

  private getMissingConfig(config: SamoIncomingConfig) {
    return [
      ['SAMO_XMLGATE_ENDPOINT', config.endpoint],
      ['SAMO_XMLGATE_AES_KEY', config.aesKey],
      ['SAMO_XMLGATE_USER', config.user],
      ['SAMO_XMLGATE_PASSWORD', config.password],
      ['SAMO_INCOMING_HOTEL_CODE', config.hotelCode],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);
  }

  private async sendXmlGateRequest(
    config: SamoIncomingConfig,
    reservationXml: string,
    partnerToken: string,
  ) {
    if (!config.endpoint) {
      throw new Error('SAMO_XMLGATE_ENDPOINT is empty');
    }

    const method = config.method.toUpperCase() === 'GET' ? 'GET' : 'POST';
    const url = new URL(config.endpoint);
    url.searchParams.set('samo_action', config.action);
    url.searchParams.set('form', config.form);
    url.searchParams.set('type', config.type);
    url.searchParams.set('partner_token', partnerToken);
    if (config.aesKey) {
      url.searchParams.set('AES KEY', config.aesKey);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    const body = new URLSearchParams();
    body.set('form', config.form);
    body.set(config.payloadParam, reservationXml);

    if (method === 'GET') {
      for (const [key, value] of body.entries()) {
        url.searchParams.set(key, value);
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          Accept: 'text/xml, application/xml, text/plain, */*',
        },
        body: method === 'GET' ? undefined : body,
        signal: controller.signal,
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
      }

      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async initReservation(
    config: SamoIncomingConfig,
    payload: SamoClaimPayload,
    partnerToken: string,
  ) {
    if (!config.endpoint) {
      throw new Error('SAMO_XMLGATE_ENDPOINT is empty');
    }

    const checkin = this.formatSamoPacketDate(payload.travelDate ?? payload.createdAt);
    const packetId = [
      checkin,
      config.nights,
      config.hotelCode,
      config.roomCode,
      config.htplaceCode,
      config.mealCode,
    ].join('|');
    const url = new URL(config.endpoint);
    url.searchParams.set('samo_action', 'reference');
    url.searchParams.set('form', config.form);
    url.searchParams.set('type', 'init');
    url.searchParams.set('partner_token', partnerToken);
    url.searchParams.set('id', packetId);
    if (config.aesKey) {
      url.searchParams.set('AES KEY', config.aesKey);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/xml, application/xml, text/plain, */*',
        },
        signal: controller.signal,
      });
      const raw = await response.text();

      if (!response.ok) {
        throw new Error(`SAMO XMLGate init failed: HTTP ${response.status}: ${raw.slice(0, 500)}`);
      }

      if (/<Error\b/i.test(raw)) {
        throw new Error(`SAMO XMLGate init failed: ${raw.replace(/\s+/g, ' ').trim().slice(0, 500)}`);
      }

      const reservation = this.extractReservationXml(raw);
      const guid = this.readXmlAttribute(reservation.match(/<Claim\b[^>]*>/i)?.[0] ?? '', 'guid');
      if (!guid) {
        throw new Error(`SAMO XMLGate init response does not contain guid: ${raw.replace(/\s+/g, ' ').trim().slice(0, 500)}`);
      }

      return reservation;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getPartnerToken(config: SamoIncomingConfig) {
    if (!config.endpoint || !config.user || !config.password || !config.aesKey) {
      throw new Error('SAMO XMLGate auth config is incomplete');
    }

    const url = new URL(config.endpoint);
    url.searchParams.set('samo_action', 'auth');
    let lastResponse = '';

    for (const passwordDigest of this.buildPasswordDigestCandidates(config.password, config.aesKey)) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
      const body = new URLSearchParams();
      body.set('login', config.user);
      body.set('passwordDigest', passwordDigest);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
            Accept: 'text/xml, application/xml, text/plain, */*',
          },
          body,
          signal: controller.signal,
        });
        const raw = await response.text();
        lastResponse = raw;

        if (!response.ok) {
          throw new Error(`SAMO XMLGate auth failed: HTTP ${response.status}`);
        }

        const token = raw.match(/partner_token="([^"]+)"/i)?.[1];
        if (token) {
          return token;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(
      `SAMO XMLGate auth response does not contain partner_token: ${lastResponse.replace(/\s+/g, ' ').trim().slice(0, 500)}`,
    );
  }

  private buildPasswordDigestCandidates(password: string, aesKey: string) {
    const now = new Date();
    const dates = [
      now,
      new Date(now.getTime() - 30_000),
      new Date(now.getTime() + 30_000),
      new Date(now.getTime() - 60_000),
      new Date(now.getTime() + 60_000),
      new Date(now.getTime() - 5 * 60_000),
      new Date(now.getTime() + 5 * 60_000),
    ];
    const salts = new Set<string>();

    for (const date of dates) {
      for (const value of this.getDateSaltValues(date)) {
        salts.add(createHash('md5').update(value).digest('hex'));
      }
    }

    const digests = new Set<string>();
    for (const salt of salts) {
      for (const key of this.getAesKeyCandidates(aesKey)) {
        digests.add(this.encryptPasswordDigest(password, salt, key));
      }
    }

    return [...digests];
  }

  private getDateSaltValues(date: Date) {
    const values = new Set<string>();
    const offsetsMinutes = [0, 300, 180, 240, 360];

    for (const offsetMinutes of offsetsMinutes) {
      const parts = this.getDateParts(date, offsetMinutes);
      const dateOnly = `${parts.year}-${parts.month}-${parts.day}`;
      const dateTime = `${dateOnly}T${parts.hour}:${parts.minute}:${parts.second}`;
      const minuteDateTime = `${dateOnly}T${parts.hour}:${parts.minute}:00`;
      const compactDate = `${parts.year}${parts.month}${parts.day}`;

      [
        dateTime,
        minuteDateTime,
        `${dateOnly} ${parts.hour}:${parts.minute}:${parts.second}`,
        `${dateOnly} ${parts.hour}:${parts.minute}:00`,
        dateOnly,
        compactDate,
        `${compactDate}${parts.hour}${parts.minute}${parts.second}`,
        `${compactDate}${parts.hour}${parts.minute}00`,
        `${parts.day}.${parts.month}.${parts.year}`,
      ].forEach((value) => values.add(value));
    }

    values.add(date.toISOString());

    return [...values];
  }

  private getDateParts(date: Date, offsetMinutes: number) {
    const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
    const pad = (value: number) => String(value).padStart(2, '0');

    return {
      year: String(shifted.getUTCFullYear()),
      month: pad(shifted.getUTCMonth() + 1),
      day: pad(shifted.getUTCDate()),
      hour: pad(shifted.getUTCHours()),
      minute: pad(shifted.getUTCMinutes()),
      second: pad(shifted.getUTCSeconds()),
    };
  }

  private getAesKeyCandidates(aesKey: string) {
    const keys: Buffer[] = [];
    const normalizedHex = aesKey.trim();
    if (/^[a-f0-9]+$/i.test(normalizedHex) && normalizedHex.length % 2 === 0) {
      keys.push(Buffer.from(normalizedHex, 'hex'));
    }

    keys.push(Buffer.from(aesKey, 'utf8'));

    const uniqueKeys = new Map<string, Buffer>();
    for (const key of keys) {
      if ([16, 24, 32].includes(key.length)) {
        uniqueKeys.set(key.toString('hex'), key);
      }
    }

    if (!uniqueKeys.size) {
      throw new Error('SAMO XMLGate AES key must be 16, 24 or 32 bytes');
    }

    return [...uniqueKeys.values()];
  }

  private encryptPasswordDigest(password: string, salt: string, key: Buffer) {
    const cipher = createCipheriv(`aes-${key.length * 8}-cbc`, key, Buffer.alloc(16));
    return Buffer.concat([
      cipher.update(Buffer.from(`${password}${salt}`, 'utf8')),
      cipher.final(),
    ]).toString('base64');
  }

  private buildReservationXml(
    config: SamoIncomingConfig,
    payload: SamoClaimPayload,
    initReservationXml: string,
  ) {
    const adults = Math.max(1, payload.groupSize ?? 1);
    const dateBeg = payload.travelDate ?? payload.createdAt;
    const duration = config.nights;
    const price = this.normalizePrice(payload.tour.price);
    const currency = payload.tour.currency ?? this.configService.get<string>('SAMO_XMLGATE_DEFAULT_CURRENCY') ?? 'USD';
    const guid =
      this.readXmlAttribute(initReservationXml.match(/<Claim\b[^>]*>/i)?.[0] ?? '', 'guid') ??
      '';
    const tourists = this.buildTourists(payload, adults);
    const members = tourists
      .map((tourist) => `        <Member TouristID="${tourist.id}"/>`)
      .join('\n');
    const note = this.escapeXml(this.buildNote(payload));

    return `<Reservation>
  <Tourists>
${tourists.map((tourist) => tourist.xml).join('\n')}
  </Tourists>
  <Payer Name="${this.escapeXml(`${payload.person.lastName} ${payload.person.firstName}`)}" Phone="" EMail="" Address="" PassportSerie="${this.escapeXml(payload.person.documentSeries ?? '')}" PassportNo="${this.escapeXml(payload.person.documentNumber ?? '')}" IssueDate="1900-01-01T00:00:00" IssuePlace=""/>
  <Rooms>
    <Room RoomID="0" Hotel="${this.escapeXml(config.hotelCode ?? '')}" Hotel_Name="${this.escapeXml(config.hotelName)}" Date="${this.formatSamoDate(dateBeg)}" Duration="${duration}" Room="${this.escapeXml(config.roomCode)}" Room_Name="${this.escapeXml(config.roomName)}" Htplace="${this.escapeXml(config.htplaceCode)}" Htplace_Name="${this.escapeXml(config.htplaceName)}" Meal="${this.escapeXml(config.mealCode)}" Meal_Name="${this.escapeXml(config.mealName)}" confirm="0" Price="${price}" Currency="${this.escapeXml(currency)}" rcount="1">
      <Members>
${members}
      </Members>
    </Room>
  </Rooms>
  <Claims>
    <Claim condition="ccOffer" status="Not confirmed" payStatus="Unpaid" peopleCount="${adults}" adult="${adults}" child="0" guid="${this.escapeXml(guid)}" partnername="B2B Website Integration" BookingDate="${this.formatSamoDate(payload.createdAt)}" Date="${this.formatSamoDate(dateBeg)}" Duration="${duration}" comment="${note}"/>
  </Claims>
  <Services/>
  <VariantServices/>
  <Moneys>
    <Money TotalPrice="${price}" Currency="${this.escapeXml(currency)}"/>
  </Moneys>
</Reservation>`;
  }

  private buildTourists(payload: SamoClaimPayload, count: number) {
    return Array.from({ length: count }, (_, index) => {
      const isMainPerson = index === 0;
      const id = index;
      const name = isMainPerson
        ? `${payload.person.lastName}/${payload.person.firstName}`.toUpperCase()
        : `GUEST/${index + 1}`;
      const gender = this.mapHuman(payload.person.sex);
      const born = payload.person.birthDate ?? new Date('1970-01-01T00:00:00.000Z');
      const passportSerie = isMainPerson ? payload.person.documentSeries ?? '' : '';
      const passportNo = isMainPerson ? payload.person.documentNumber ?? '' : '';

      return {
        id,
        xml: `    <Tourist ID="${id}" Name="${this.escapeXml(name)}" Gender="${gender}" BornDate="${this.formatSamoDate(born)}" PassportSerie="${this.escapeXml(passportSerie)}" PassportNo="${this.escapeXml(passportNo)}"/>`,
      };
    });
  }

  private buildNote(payload: SamoClaimPayload) {
    const lines = [
      `Local booking: ${payload.bookingNumber}`,
      ...this.buildSourceNoteLines(payload),
      `Tour: ${payload.tour.title}`,
      payload.tour.transport ? `Transport: ${payload.tour.transport}` : undefined,
      payload.tour.hotels ? `Hotels: ${payload.tour.hotels}` : undefined,
      payload.hotelName ? `Requested hotel: ${payload.hotelName}` : undefined,
      payload.tour.includedServices.length > 0
        ? `Included services: ${payload.tour.includedServices.join(', ')}`
        : undefined,
      payload.specialRequests ? `Partner note: ${payload.specialRequests}` : undefined,
      'Created under replicated hotel. Manager will complete services manually.',
    ].filter(Boolean);

    return lines.join(' | ').slice(0, 255);
  }

  private normalizePrice(value?: string | null) {
    const amount = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(amount) && amount > 0 ? amount.toFixed(4) : '0.0000';
  }

  private buildSourceNoteLines(payload: SamoClaimPayload) {
    const lines: string[] = [];

    if (payload.source?.audience) {
      lines.push(`Audience: ${payload.source.audience}`);
    }

    if (payload.source?.pageTitle || payload.source?.pagePath) {
      lines.push(
        `Source page: ${[payload.source.pageTitle, payload.source.pagePath]
          .filter(Boolean)
          .join(' - ')}`,
      );
    }

    if (
      payload.linkedEntity?.type ||
      payload.linkedEntity?.title ||
      payload.linkedEntity?.slug ||
      payload.linkedEntity?.id
    ) {
      lines.push(
        `Source item: ${[
          payload.linkedEntity.type,
          payload.linkedEntity.title,
          payload.linkedEntity.slug,
          payload.linkedEntity.id,
        ]
          .filter(Boolean)
          .join(' - ')}`,
      );
    }

    return lines;
  }

  private buildSourceMetadata(payload: SamoClaimPayload) {
    return {
      audience: payload.source?.audience ?? null,
      pagePath: payload.source?.pagePath ?? null,
      pageTitle: payload.source?.pageTitle ?? null,
      entityType: payload.linkedEntity?.type ?? null,
      entityId: payload.linkedEntity?.id ?? null,
      entitySlug: payload.linkedEntity?.slug ?? null,
      entityTitle: payload.linkedEntity?.title ?? null,
    };
  }

  private buildTargetMetadata(config: SamoIncomingConfig): SamoIncomingTargetMetadata {
    return {
      tourId: config.tourId ?? null,
      hotelCode: config.hotelCode ?? null,
      hotelName: config.hotelName,
      roomCode: config.roomCode,
      roomName: config.roomName,
      htplaceCode: config.htplaceCode,
      htplaceName: config.htplaceName,
      mealCode: config.mealCode,
      mealName: config.mealName,
    };
  }

  private parseResponse(response: string) {
    const claimTag = response.match(/<Claim\b[^>]*>/i)?.[0] ?? response.match(/<claim\b[^>]*>/i)?.[0];
    if (!claimTag) {
      return {
        message: 'SAMO response does not contain claim result',
      };
    }

    const result = Number(this.readXmlAttribute(claimTag, 'result'));
    const operatorNumber = this.readXmlAttribute(claimTag, 'Operator_number');
    return {
      confirmStatus: this.readXmlAttribute(claimTag, 'confirm_status') ?? undefined,
      result: Number.isNaN(result) ? undefined : result,
      comment: this.readXmlAttribute(claimTag, 'comment') ?? undefined,
      message:
        this.readXmlAttribute(claimTag, 'message') ??
        (operatorNumber ? `SAMO booking created: ${operatorNumber}` : undefined),
    };
  }

  private readXmlAttribute(tag: string, attribute: string) {
    return tag.match(new RegExp(`${attribute}="([^"]*)"`))?.[1] ?? null;
  }

  private extractReservationXml(response: string) {
    const reservation = response.match(/<Reservation\b[\s\S]*<\/Reservation>/i)?.[0];
    if (!reservation) {
      throw new Error(
        `SAMO XMLGate response does not contain Reservation XML: ${response.replace(/\s+/g, ' ').trim().slice(0, 500)}`,
      );
    }

    return reservation;
  }

  private buildClaimNumber(bookingNumber: string, createdAt: Date) {
    const numericPart = bookingNumber.replace(/\D/g, '').slice(-7);
    const fallback = String(createdAt.getTime()).slice(-7);
    return Number(numericPart || fallback);
  }

  private buildPeopleInc(createdAt: Date, index: number) {
    return Number(`${String(createdAt.getTime()).slice(-8)}${index}`.slice(0, 9));
  }

  private mapHuman(sex?: string | null) {
    const normalized = sex?.toLowerCase();
    return normalized === 'female' || normalized === 'f' || normalized === 'mrs'
      ? 'MRS'
      : 'MR';
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private formatSamoDate(date: Date) {
    return date.toISOString().slice(0, 19);
  }

  private formatSamoPacketDate(date: Date) {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  private escapeXml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
