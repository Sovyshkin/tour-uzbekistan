import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createHash } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';

type SamoClaimPerson = {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  sex?: string | null;
  birthDate?: Date | null;
  nationality?: string | null;
  documentSeries?: string | null;
  documentNumber?: string | null;
  documentIssuedAt?: Date | null;
  documentValidUntil?: Date | null;
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
  adultCount?: number | null;
  childCount?: number | null;
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
  operatorNumber?: string;
  condition?: string;
  status?: string;
  payStatus?: string;
  confirmStatus?: string;
  result?: number;
  comment?: string;
  errorCode?: string;
  errorDetail?: string;
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
  resolvedPrice?: number;
  resolvedCurrency?: string;
  nights: number;
  timeoutMs: number;
};

type SamoHotelPricePacket = {
  roomCode: string;
  htplaceCode: string;
  mealCode: string;
  nights: number;
  price: number;
  currency?: string;
  raw: Record<string, string>;
};

type IncomingMappingRecord = {
  samoCode: string;
  samoName: string;
} | null;

type AdminIncomingMappings = {
  roomMapping: IncomingMappingRecord;
  placementMapping: IncomingMappingRecord;
  adults: number;
  children: number;
};

@Injectable()
export class SamoIncomingService {
  private readonly logger = new Logger(SamoIncomingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async sendBooking(payload: SamoClaimPayload): Promise<SamoIncomingResult> {
    let config = this.getConfig(payload);
    const source = this.buildSourceMetadata(payload);
    let target = this.buildTargetMetadata(config);

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
      const mappings = await this.resolveAdminMappings(config, payload);
      if (!mappings.placementMapping) {
        return this.buildManualModeResult({
          config,
          source,
          claimNumber,
          message: `Incoming placement is not linked for ${mappings.adults} adult(s) and ${mappings.children} child(ren). Manual manager confirmation is required.`,
        });
      }

      config = this.applyAdminMappings(config, mappings);
      target = this.buildTargetMetadata(config);
      const partnerToken = await this.getPartnerToken(config);
      const pricePacket = await this.resolveHotelPricePacket(config, partnerToken, payload);
      if (!pricePacket) {
        return this.buildManualModeResult({
          config,
          source,
          claimNumber,
          message: `Incoming price packet was not found for hotel ${config.hotelCode}, room ${config.roomName}, placement ${config.htplaceName}. Manual manager confirmation is required.`,
        });
      }

      config = this.applyHotelPricePacket(config, pricePacket);
      target = this.buildTargetMetadata(config);
      const initXml = await this.initReservation(config, payload, partnerToken);
      config = this.applyInitReservationData(config, initXml);
      target = this.buildTargetMetadata(config);
      requestXml = this.buildReservationXml(config, payload, initXml);
      requestXml = this.sanitizeReservationXml(requestXml);
      const response = await this.sendXmlGateRequest(config, requestXml, partnerToken);
      const parsedResponse = this.parseResponse(response);
      if (parsedResponse.errorCode) {
        return {
          enabled: true,
          sent: false,
          skippedReason: parsedResponse.message,
          claimNumber,
          requestXml,
          rawResponse: response,
          source,
          target,
          ...parsedResponse,
        };
      }

      return {
        enabled: true,
        sent: true,
        claimNumber,
        requestXml,
        rawResponse: response,
        source,
        target,
        ...parsedResponse,
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

  private buildManualModeResult({
    config,
    source,
    claimNumber,
    message,
  }: {
    config: SamoIncomingConfig;
    source: SamoIncomingSourceMetadata;
    claimNumber: number;
    message: string;
  }): SamoIncomingResult {
    return {
      enabled: true,
      sent: false,
      skippedReason: message,
      claimNumber,
      message,
      source,
      target: this.buildTargetMetadata(config),
    };
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

  private async resolveAdminMappings(
    config: SamoIncomingConfig,
    payload: SamoClaimPayload,
  ): Promise<AdminIncomingMappings> {
    const adults = Math.max(1, payload.adultCount ?? payload.groupSize ?? 1);
    const children = Math.max(0, payload.childCount ?? 0);
    const [roomMapping, placementMapping] = await Promise.all([
      this.findRoomMapping(config.roomName),
      this.findPlacementMapping(adults, children),
    ]);

    return {
      roomMapping,
      placementMapping,
      adults,
      children,
    };
  }

  private applyAdminMappings(
    config: SamoIncomingConfig,
    mappings: AdminIncomingMappings,
  ): SamoIncomingConfig {
    return {
      ...config,
      roomCode: mappings.roomMapping?.samoCode ?? config.roomCode,
      roomName: mappings.roomMapping?.samoName ?? config.roomName,
      htplaceCode: mappings.placementMapping?.samoCode ?? config.htplaceCode,
      htplaceName: mappings.placementMapping?.samoName ?? config.htplaceName,
    };
  }

  private async findRoomMapping(roomName: string) {
    const normalized = this.normalizeMappingKey(roomName);
    const withoutRoomSuffix = normalized.replace(/\s+room$/i, '');
    const keys = Array.from(new Set([normalized, withoutRoomSuffix].filter(Boolean)));
    return this.prisma.incomingMapping.findFirst({
      where: {
        type: 'room',
        isActive: true,
        OR: [
          { cmsKey: { in: keys } },
          { cmsLabel: { equals: roomName, mode: 'insensitive' } },
          { samoName: { equals: roomName, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async findPlacementMapping(adultCount: number, childCount: number) {
    return this.prisma.incomingMapping.findFirst({
      where: {
        type: 'placement',
        isActive: true,
        adultCount,
        childCount,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private normalizeMappingKey(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
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

    const checkinDate = this.getIncomingCheckinDate(payload);
    const checkin = this.formatSamoPacketDate(checkinDate);
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

  private async resolveHotelPricePacket(
    config: SamoIncomingConfig,
    partnerToken: string,
    payload: SamoClaimPayload,
  ): Promise<SamoHotelPricePacket | null> {
    if (!config.endpoint || !config.hotelCode) {
      return null;
    }

    const url = new URL(config.endpoint);
    url.searchParams.set('samo_action', 'reference');
    url.searchParams.set('form', config.form);
    url.searchParams.set('type', 'hotelsalepr');
    url.searchParams.set('laststamp', '0x0000000000000000');
    url.searchParams.set('delstamp', '0x0000000000000000');
    url.searchParams.set('hotel', config.hotelCode);
    url.searchParams.set('partner_token', partnerToken);
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

      if (!response.ok || /<Error\b/i.test(raw)) {
        return null;
      }

      return this.pickMinimalHotelPricePacket(this.parseXmlItems(raw), payload, config);
    } finally {
      clearTimeout(timeout);
    }
  }

  private applyHotelPricePacket(
    config: SamoIncomingConfig,
    packet: SamoHotelPricePacket | null,
  ): SamoIncomingConfig {
    if (!packet) {
      return config;
    }

    return {
      ...config,
      roomCode: packet.roomCode,
      htplaceCode: packet.htplaceCode,
      mealCode: packet.mealCode,
      nights: packet.nights,
    };
  }

  private applyInitReservationData(
    config: SamoIncomingConfig,
    initReservationXml: string,
  ): SamoIncomingConfig {
    const roomTag = initReservationXml.match(/<Room\b[^>]*>/i)?.[0] ?? '';
    const moneyTag = initReservationXml.match(/<Money\b[^>]*>/i)?.[0] ?? '';
    const resolvedPrice = this.readMoneyAttribute(moneyTag, [
      'TotalPrice',
      'Price',
      'Amount',
      'Total',
    ]);
    const roomPrice = this.readMoneyAttribute(roomTag, ['Price', 'TotalPrice', 'Amount']);
    const currency =
      this.readXmlAttribute(moneyTag, 'Currency') ??
      this.readXmlAttribute(roomTag, 'Currency') ??
      config.resolvedCurrency;

    return {
      ...config,
      roomName: this.readXmlAttribute(roomTag, 'Room_Name') ?? config.roomName,
      htplaceName: this.readXmlAttribute(roomTag, 'Htplace_Name') ?? config.htplaceName,
      mealName: this.readXmlAttribute(roomTag, 'Meal_Name') ?? config.mealName,
      resolvedPrice: resolvedPrice ?? roomPrice ?? config.resolvedPrice,
      resolvedCurrency: this.normalizeCurrency(currency),
    };
  }

  private pickMinimalHotelPricePacket(
    items: Record<string, string>[],
    payload: SamoClaimPayload,
    config: SamoIncomingConfig,
  ) {
    const expectedAdults = Math.max(1, payload.adultCount ?? payload.groupSize ?? 1);
    const expectedChildren = Math.max(0, payload.childCount ?? 0);
    const prices = items
      .filter((item) => item._type?.toLowerCase() === 'hprice')
      .filter((item) => item.status?.trim().toUpperCase() !== 'D')
      .map<SamoHotelPricePacket | null>((item) => {
        const roomCode = this.readFirstTextField(item, [
          'room',
          'roominc',
          'room_inc',
          'roomid',
          'room_id',
          'roomcode',
        ]);
        const htplaceCode = this.readFirstTextField(item, [
          'htplace',
          'htplaceinc',
          'htplace_inc',
          'htplaceid',
          'htplace_id',
          'htplacecode',
        ]);
        const mealCode = this.readFirstTextField(item, [
          'meal',
          'mealinc',
          'meal_inc',
          'mealid',
          'meal_id',
          'mealcode',
        ]);
        const priceValue = this.readFirstTextField(item, [
          'price',
          'amount',
          'cost',
          'total',
          'totalprice',
          'saleprice',
        ]);
        const nightsValue = this.readFirstTextField(item, [
          'nights',
          'night',
          'nightsfrom',
          'duration',
        ]);
        const price = Number(String(priceValue ?? '').replace(/\s/g, '').replace(',', '.'));
        const nights = Number(nightsValue ?? 1);

        if (
          !Number.isFinite(price) ||
          price <= 0 ||
          !roomCode ||
          !htplaceCode ||
          !mealCode
        ) {
          return null;
        }

        return {
          roomCode,
          htplaceCode,
          mealCode,
          nights: Number.isFinite(nights) && nights > 0 ? nights : 1,
          price,
          currency: this.readFirstTextField(item, [
            'currency',
            'currencyinc',
            'currency_inc',
            'curr',
          ]) ?? undefined,
          raw: item,
        };
      })
      .filter((item): item is SamoHotelPricePacket => Boolean(item));

    const exactMappedPrices = prices
      .filter((item) => item.htplaceCode === config.htplaceCode)
      .filter((item) => item.roomCode === config.roomCode)
      .sort((a, b) => a.price - b.price);

    if (exactMappedPrices[0]) {
      return exactMappedPrices[0];
    }

    return prices
      .filter((item) => this.matchesHtplaceOccupancy(item.raw, expectedAdults, expectedChildren))
      .filter((item) => item.roomCode === config.roomCode)
      .sort((a, b) => a.price - b.price)[0] ?? null;
  }

  private matchesHtplaceOccupancy(item: Record<string, string>, adults: number, children: number) {
    const adultFields = ['adult', 'adults', 'adultcnt', 'adultcount', 'paxadult', 'adl'];
    const childFields = ['child', 'children', 'childcnt', 'childcount', 'paxchild', 'chd'];
    const explicitAdults = this.readFirstNumericField(item, adultFields);
    const explicitChildren = this.readFirstNumericField(item, childFields);

    if (explicitAdults !== null || explicitChildren !== null) {
      return (explicitAdults ?? adults) === adults && (explicitChildren ?? children) === children;
    }

    const text = [
      item.htplacename,
      item.htplace_name,
      item.place,
      item.placename,
      item.name,
      item.lname,
      item.longname,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!text) {
      return false;
    }

    const containsChildren = /\b(chd|child|children|kid|kids|реб|дет)/i.test(text);
    const adultMatch = text.match(/(\d+)\s*(adl|adult|adults|взр)/i);
    return !containsChildren && Number(adultMatch?.[1]) === adults;
  }

  private readFirstNumericField(item: Record<string, string>, keys: string[]) {
    for (const key of keys) {
      const value = item[key] ?? item[key.toUpperCase()] ?? item[key.toLowerCase()];
      if (value === undefined || value === null || String(value).trim() === '') {
        continue;
      }
      const number = Number(String(value ?? '').replace(',', '.'));
      if (Number.isFinite(number)) {
        return number;
      }
    }

    return null;
  }

  private readFirstTextField(item: Record<string, string>, keys: string[]) {
    for (const key of keys) {
      const exactValue = item[key] ?? item[key.toUpperCase()] ?? item[key.toLowerCase()];
      if (exactValue !== undefined && exactValue !== null && String(exactValue).trim() !== '') {
        return String(exactValue).trim();
      }

      const normalizedKey = key.toLowerCase().replace(/[_:-]/g, '');
      const entry = Object.entries(item).find(
        ([itemKey, value]) =>
          itemKey.toLowerCase().replace(/[_:-]/g, '') === normalizedKey &&
          value !== undefined &&
          value !== null &&
          String(value).trim() !== '',
      );

      if (entry) {
        return String(entry[1]).trim();
      }
    }

    return null;
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
    const adults = Math.max(1, payload.adultCount ?? payload.groupSize ?? 1);
    const children = Math.max(0, payload.childCount ?? 0);
    const peopleCount = adults + children;
    const tourists = this.buildTourists(payload, peopleCount, adults);
    const members = tourists
      .map((tourist) => `        <Member TouristID="${tourist.id}" />`)
      .join('\n');
    const notesXml = this.buildNotesXml(payload);
    let reservationXml = initReservationXml.trim();

    reservationXml = this.replaceXmlSection(
      reservationXml,
      'Tourists',
      `  <Tourists>\n${tourists.map((tourist) => tourist.xml).join('\n')}\n  </Tourists>`,
    );
    reservationXml = this.removeXmlTagAfter(reservationXml, /<\/checkFields>/i, 'Payer');
    reservationXml = this.insertAfterXmlSection(reservationXml, 'Tourists', '  <Payer />');
    reservationXml = reservationXml.replace(
      /<Members\b[^>]*>[\s\S]*?<\/Members>/i,
      `      <Members>\n${members}\n      </Members>`,
    );
    reservationXml = this.normalizeReservationMoneyXml(reservationXml);
    reservationXml = this.removeEmptyXmlSection(reservationXml, 'VariantServices');
    reservationXml = this.upsertXmlSection(reservationXml, 'Notes', notesXml);

    return reservationXml;
  }

  private buildNotesXml(payload: SamoClaimPayload): string {
    const note = this.buildNoteText(payload);

    if (!note) {
      return '  <Notes/>';
    }

    return `  <Notes>\n    <Note note="${this.escapeXml(note)}"/>\n  </Notes>`;
  }

  private buildNoteText(payload: SamoClaimPayload): string {
    const adults = Math.max(1, payload.adultCount ?? payload.groupSize ?? 1);
    const children = Math.max(0, payload.childCount ?? 0);
    const peopleCount = adults + children;

    const parts: string[] = [];

    parts.push(`Booking: ${payload.bookingNumber}`);
    parts.push(`Tour: ${payload.tour.title}`);
    parts.push(`Travelers: ${peopleCount} total, ${adults} adult(s), ${children} child(ren)`);

    if (payload.source?.pagePath) {
      parts.push(
        `Source page: ${[payload.source.pageTitle, payload.source.pagePath]
          .filter(Boolean)
          .join(' - ')}`,
      );
    }

    if (payload.tour.includedServices.length > 0) {
      parts.push(`Included: ${payload.tour.includedServices.join(', ')}`);
    }

    if (payload.specialRequests) {
      parts.push(`Comment: ${payload.specialRequests}`);
    }

    return parts.join(' | ');
  }

  private buildTourists(payload: SamoClaimPayload, count: number, adultCount: number) {
    return Array.from({ length: count }, (_, index) => {
      const isMainPerson = index === 0;
      const id = index;
      const isAdult = index < adultCount;
      const firstName = isMainPerson
        ? payload.person.firstName.toUpperCase()
        : isAdult
          ? `ADULT ${index + 1}`
          : `CHILD ${index - adultCount + 1}`;
      const lastName = isMainPerson ? payload.person.lastName.toUpperCase() : 'TOURIST';
      const fullName = `${lastName} ${firstName}`.trim();
      const gender = this.mapHuman(payload.person.sex);
      const born = isAdult
        ? this.getSafeAdultBirthDate(payload.person.birthDate)
        : new Date(Date.UTC(2016, 0, 1));
      const passportSerie = isMainPerson ? payload.person.documentSeries ?? '' : '';
      const passportNo = isMainPerson ? payload.person.documentNumber ?? '' : '';

      return {
        id,
        xml: `    <Tourist ID="${id}" Name="${this.escapeXml(fullName)}" Gender="${gender}" BornDate="${this.formatSamoPlainDate(born)}" PassportSerie="${this.escapeXml(passportSerie)}" PassportNo="${this.escapeXml(passportNo)}" />`,
      };
    });
  }

  private normalizePrice(value?: string | number | null) {
    const amount = this.normalizeSamoAmount(value);
    return Number.isFinite(amount) && amount > 0 ? amount.toFixed(4) : '0.0000';
  }

  private readMoneyAttribute(tag: string, attributes: string[]) {
    for (const attribute of attributes) {
      const value = this.readXmlAttribute(tag, attribute);
      const amount = this.normalizeSamoAmount(value);
      if (Number.isFinite(amount) && amount > 0) {
        return amount;
      }
    }

    return undefined;
  }

  private replaceXmlSection(xml: string, tagName: string, replacement: string) {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'i');

    if (!pattern.test(xml)) {
      return this.insertBeforeReservationClose(xml, replacement);
    }

    return xml.replace(pattern, replacement);
  }

  private replaceXmlTagAfter(
    xml: string,
    marker: RegExp,
    tagName: string,
    replacement: string,
  ) {
    const markerMatch = xml.match(marker);
    if (!markerMatch || markerMatch.index === undefined) {
      return xml.replace(new RegExp(`<${tagName}\\b[^>]*(?:\\/|>[\\s\\S]*?<\\/${tagName})>`, 'i'), replacement);
    }

    const splitAt = markerMatch.index + markerMatch[0].length;
    const before = xml.slice(0, splitAt);
    const after = xml.slice(splitAt);
    const tagPattern = new RegExp(`<${tagName}\\b[^>]*(?:\\/|>[\\s\\S]*?<\\/${tagName})>`, 'i');

    if (tagPattern.test(after)) {
      return before + after.replace(tagPattern, replacement);
    }

    return before + `\n${replacement}` + after;
  }

  private removeXmlTagAfter(xml: string, marker: RegExp, tagName: string) {
    const markerMatch = xml.match(marker);
    if (!markerMatch || markerMatch.index === undefined) {
      return xml;
    }

    const splitAt = markerMatch.index + markerMatch[0].length;
    const before = xml.slice(0, splitAt);
    const after = xml.slice(splitAt);
    const tagPattern = new RegExp(`<${tagName}\\b[^>]*(?:\\/|>[\\s\\S]*?<\\/${tagName})>`, 'i');

    return before + after.replace(tagPattern, '');
  }

  private insertAfterXmlSection(xml: string, tagName: string, value: string) {
    const pattern = new RegExp(`(<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>)`, 'i');

    if (!pattern.test(xml)) {
      return this.insertBeforeReservationClose(xml, value);
    }

    return xml.replace(pattern, `$1\n${value}`);
  }

  private upsertXmlSection(xml: string, tagName: string, replacement: string) {
    const expandedPattern = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'i');
    const selfClosingPattern = new RegExp(`<${tagName}\\b[^>]*/>`, 'i');

    if (expandedPattern.test(xml)) {
      return xml.replace(expandedPattern, replacement);
    }

    if (selfClosingPattern.test(xml)) {
      return xml.replace(selfClosingPattern, replacement);
    }

    return this.insertBeforeReservationClose(xml, replacement);
  }

  private removeEmptyXmlSection(xml: string, tagName: string) {
    return xml
      .replace(new RegExp(`<${tagName}\\b[^>]*/>`, 'i'), '')
      .replace(new RegExp(`<${tagName}\\b[^>]*>\\s*<\\/${tagName}>`, 'i'), '');
  }

  private insertBeforeReservationClose(xml: string, value: string) {
    return xml.replace(/\s*<\/Reservation>\s*$/i, `\n${value}\n</Reservation>`);
  }

  private patchFirstXmlTag(
    xml: string,
    tagName: string,
    attributes: Record<string, string>,
  ) {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'i');

    return xml.replace(pattern, (tag) => {
      let nextTag = tag;
      for (const [name, value] of Object.entries(attributes)) {
        const escapedValue = this.escapeXml(value);
        const attrPattern = new RegExp(`\\s${name}="[^"]*"`, 'i');
        if (attrPattern.test(nextTag)) {
          nextTag = nextTag.replace(attrPattern, ` ${name}="${escapedValue}"`);
        } else {
          nextTag = nextTag.replace(/\/?>$/, ` ${name}="${escapedValue}"$&`);
        }
      }

      return nextTag;
    });
  }

  private patchFirstXmlTagAfter(
    xml: string,
    marker: RegExp,
    tagName: string,
    attributes: Record<string, string>,
  ) {
    const markerMatch = xml.match(marker);
    if (!markerMatch || markerMatch.index === undefined) {
      return this.patchFirstXmlTag(xml, tagName, attributes);
    }

    const splitAt = markerMatch.index + markerMatch[0].length;
    return (
      xml.slice(0, splitAt) +
      this.patchFirstXmlTag(xml.slice(splitAt), tagName, attributes)
    );
  }

  private normalizeReservationMoneyXml(xml: string) {
    return xml.replace(/\s(Price|TotalPrice)="([^"]+)"/g, (_match, name, value) => {
      return ` ${name}="${this.normalizePrice(value)}"`;
    });
  }

  private sanitizeReservationXml(xml: string) {
    const normalizedXml = this.normalizeReservationMoneyXml(xml);
    const checkFields = normalizedXml.match(/<checkFields\b[^>]*>[\s\S]*?<\/checkFields>/i)?.[0];

    if (checkFields && /<Payer\b[^>]*\s(?:Name|Phone|EMail|PassportSerie|PassportNo)=/i.test(checkFields)) {
      throw new Error('SAMO XMLGate request is invalid: payer data was inserted into checkFields');
    }

    return normalizedXml;
  }

  private normalizeSamoAmount(value?: string | number | null) {
    const rawAmount = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));

    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return rawAmount;
    }

    if (rawAmount >= 1_000_000) {
      return rawAmount / 1_000_000;
    }

    return rawAmount;
  }

  private normalizeCurrency(value?: string | null) {
    const fallback = this.configService.get<string>('SAMO_XMLGATE_DEFAULT_CURRENCY') ?? 'USD';
    const normalized = String(value ?? '').trim();

    if (!normalized || /^-?\d+$/.test(normalized)) {
      return fallback;
    }

    return normalized;
  }

  private getSafeAdultBirthDate(value?: Date | null) {
    const fallback = new Date(Date.UTC(1970, 0, 1));

    if (!value || Number.isNaN(value.getTime())) {
      return fallback;
    }

    const today = new Date();
    const latestAdultBirthDate = new Date(
      Date.UTC(today.getUTCFullYear() - 12, today.getUTCMonth(), today.getUTCDate()),
    );

    return value <= latestAdultBirthDate ? value : fallback;
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
    const errorTag = response.match(/<Error\b[^>]*>/i)?.[0];
    if (errorTag) {
      const errorCode = this.readXmlAttribute(errorTag, 'code') ?? undefined;
      const errorMessage = this.readXmlAttribute(errorTag, 'message') ?? 'SAMO XMLGate error';
      const errorDetail = this.readXmlAttribute(errorTag, 'detail') ?? undefined;
      return {
        errorCode,
        errorDetail,
        message: [errorCode ? `SAMO error ${errorCode}` : 'SAMO error', errorMessage, errorDetail]
          .filter(Boolean)
          .join(': '),
      };
    }

    const claimTag = response.match(/<Claim\b[^>]*>/i)?.[0] ?? response.match(/<claim\b[^>]*>/i)?.[0];
    if (!claimTag) {
      return {
        message: 'SAMO response does not contain claim result',
      };
    }

    const result = Number(this.readXmlAttribute(claimTag, 'result'));
    const operatorNumber = this.readXmlAttribute(claimTag, 'Operator_number');
    return {
      operatorNumber: operatorNumber ?? undefined,
      condition: this.readXmlAttribute(claimTag, 'condition') ?? undefined,
      status: this.readXmlAttribute(claimTag, 'status') ?? undefined,
      payStatus: this.readXmlAttribute(claimTag, 'payStatus') ?? undefined,
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

  private parseXmlItems(raw: string) {
    const items: Record<string, string>[] = [];
    const tagMatcher = /<([a-zA-Z][\w:-]*)\s+([^<>]*?)\/>/g;

    for (const match of raw.matchAll(tagMatcher)) {
      const [, tagName, attributes] = match;
      if (tagName.toLowerCase() === 'response') {
        continue;
      }

      items.push({
        _type: tagName,
        ...this.parseXmlAttributes(attributes),
      });
    }

    return items;
  }

  private parseXmlAttributes(value: string) {
    const attributes: Record<string, string> = {};
    const matcher = /([\w:-]+)\s*=\s*"([^"]*)"/g;

    for (const match of value.matchAll(matcher)) {
      attributes[match[1]] = this.decodeXml(match[2]);
    }

    return attributes;
  }

  private decodeXml(value: string) {
    return value
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
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
    const normalized = sex?.trim().toLowerCase();
    if (normalized === 'chd') {
      return 'CHD';
    }

    return normalized === 'female' ||
      normalized === 'f' ||
      normalized === 'mrs' ||
      normalized === 'ms' ||
      normalized === 'ж' ||
      normalized === 'жен' ||
      normalized === 'женщина'
      ? 'MRS'
      : 'MR';
  }

  private getIncomingCheckinDate(payload: SamoClaimPayload) {
    const selected = this.getSamoDateParts(payload.travelDate ?? payload.createdAt);

    return new Date(
      Date.UTC(
        Number(selected.year),
        Number(selected.month) - 1,
        Number(selected.day),
        0,
        0,
        0,
      ),
    );
  }

  private getSamoDateParts(date: Date) {
    const shifted = new Date(date.getTime() + 5 * 60 * 60 * 1000);
    const pad = (value: number) => String(value).padStart(2, '0');

    return {
      year: String(shifted.getUTCFullYear()),
      month: pad(shifted.getUTCMonth() + 1),
      day: pad(shifted.getUTCDate()),
    };
  }

  private formatSamoDate(date: Date) {
    return date.toISOString().slice(0, 19);
  }

  private formatSamoPlainDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private buildOptionalDateAttribute(name: string, value?: Date | null) {
    if (!value || Number.isNaN(value.getTime())) {
      return '';
    }

    return ` ${name}="${this.formatSamoPlainDate(value)}"`;
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
