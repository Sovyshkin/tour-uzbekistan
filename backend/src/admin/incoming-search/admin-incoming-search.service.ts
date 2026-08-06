import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createHash } from 'crypto';

import { AdminIncomingSearchDto } from './dto/admin-incoming-search.dto';

type XmlGateConfig = {
  endpoint?: string;
  form: string;
  aesKey?: string;
  user?: string;
  password?: string;
  timeoutMs: number;
};

type PartnerTokenCache = {
  token: string;
  expiresAt: number;
};

@Injectable()
export class AdminIncomingSearchService {
  private partnerTokenCache: PartnerTokenCache | null = null;

  constructor(private readonly configService: ConfigService) {}

  async search(dto: AdminIncomingSearchDto) {
    return this.reference(dto.referenceType, dto.extraParams);
  }

  async reference(referenceTypeValue?: string, extraParams?: string) {
    const config = this.getConfig();
    const missing = this.getMissingConfig(config);

    if (missing.length) {
      return {
        ok: false,
        skippedReason: `SAMO XMLGate config is incomplete: ${missing.join(', ')}`,
        config: this.getSafeConfig(config),
      };
    }

    const referenceType = this.normalizeReferenceType(referenceTypeValue);
    const params = this.buildReferenceParams(config, referenceType, extraParams);
    const reference = await this.request(config, params);

    return {
      ok: reference.ok,
      message: reference.ok ? undefined : `XMLGate returned HTTP ${reference.status}`,
      config: this.getSafeConfig(config),
      request: {
        endpoint: config.endpoint,
        mode: 'xmlgate-reference',
        referenceType,
        params,
      },
      summary: {
        referenceType,
        count: reference.items.length,
        firstItem: reference.items[0] ?? null,
      },
      reference,
    };
  }

  async resolveHotel(hotelCodeValue: string) {
    const hotelCode = hotelCodeValue?.trim();
    if (!hotelCode) {
      throw new BadRequestException('hotelCode is required');
    }

    const config = this.getConfig();
    const missing = this.getMissingConfig(config);
    if (missing.length) {
      return {
        ok: false,
        skippedReason: `SAMO XMLGate config is incomplete: ${missing.join(', ')}`,
        config: this.getSafeConfig(config),
      };
    }

    const params = this.buildReferenceParams(config, 'hotel');
    const reference = await this.request(config, params);
    const hotel = reference.items.find((item) => item.inc === hotelCode);

    if (!hotel) {
      return {
        ok: false,
        message: `Hotel ${hotelCode} was not found in SAMO XMLGate hotel reference`,
        config: this.getSafeConfig(config),
        reference: {
          url: reference.url,
          status: reference.status,
          ok: reference.ok,
          contentType: reference.contentType,
          count: reference.items.length,
        },
      };
    }

    const priceReference = await this.requestHotelPrices(config, hotelCode);
    const price = this.pickMinimalHotelPrice(priceReference.items);
    const currency = price ? await this.resolveCurrencyAlias(config, price.currency) : null;

    return {
      ok: true,
      config: this.getSafeConfig(config),
      hotel: {
        code: hotel.inc,
        name: hotel.name || hotel.lname || null,
        longName: hotel.lname || hotel.name || null,
        status: hotel.status || null,
        star: hotel.star || null,
        town: hotel.town || null,
        stamp: hotel.stamp || null,
        raw: hotel,
      },
      price: price
        ? {
            amount: price.amount,
            currency: currency ?? price.currency,
            sourceAttribute: 'hotelsalepr.price',
            raw: price.raw,
          }
        : null,
      priceReference: {
        url: priceReference.url,
        status: priceReference.status,
        ok: priceReference.ok,
        contentType: priceReference.contentType,
        count: priceReference.items.length,
      },
      reference: {
        url: reference.url,
        status: reference.status,
        ok: reference.ok,
        contentType: reference.contentType,
        count: reference.items.length,
      },
    };
  }

  private getConfig(): XmlGateConfig {
    return {
      endpoint: this.getFirstConfig(
        'SAMO_XMLGATE_ENDPOINT',
        'SAMO_INCOMING_XMLGATE_ENDPOINT',
        'SAMO_INCOMING_SEARCH_BASE_URL',
        'SAMO_BASE_URL',
      ),
      form:
        this.getFirstConfig('SAMO_XMLGATE_FORM', 'SAMO_INCOMING_FORM') ??
        'http://samo.travel',
      aesKey: this.getFirstConfig('SAMO_XMLGATE_AES_KEY', 'SAMO_AES_KEY'),
      user: this.getFirstConfig('SAMO_XMLGATE_USER', 'SAMO_INCOMING_USER', 'SAMO_USERNAME'),
      password: this.getFirstConfig(
        'SAMO_XMLGATE_PASSWORD',
        'SAMO_INCOMING_PASSWORD',
        'SAMO_PASSWORD',
      ),
      timeoutMs: Number(
        this.configService.get<string>('SAMO_XMLGATE_TIMEOUT_MS') ?? 15000,
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

  private getMissingConfig(config: XmlGateConfig) {
    return [
      ['SAMO_XMLGATE_ENDPOINT', config.endpoint],
      ['SAMO_XMLGATE_AES_KEY', config.aesKey],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);
  }

  private getSafeConfig(config: XmlGateConfig) {
    return {
      endpoint: config.endpoint,
      form: config.form,
      timeoutMs: config.timeoutMs,
      hasAesKey: Boolean(config.aesKey),
      hasUser: Boolean(config.user),
      hasPassword: Boolean(config.password),
    };
  }

  private normalizeReferenceType(value?: string) {
    const normalized = value?.trim().toLowerCase() || 'hotel';
    if (!/^[a-z0-9_-]+$/.test(normalized)) {
      throw new BadRequestException('referenceType must contain only latin letters, numbers, _ or -');
    }

    return normalized;
  }

  private buildReferenceParams(
    config: XmlGateConfig,
    referenceType: string,
    extraParams?: string,
  ) {
    return {
      samo_action: 'reference',
      form: config.form,
      type: referenceType,
      laststamp: '0x0000000000000000',
      delstamp: '0x0000000000000000',
      ...this.parseExtraParams(extraParams),
    };
  }

  private parseExtraParams(value?: string) {
    if (!value?.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Expected JSON object');
      }

      return Object.fromEntries(
        Object.entries(parsed).map(([key, item]) => [key, String(item ?? '')]),
      );
    } catch (error) {
      throw new BadRequestException(
        `extraParams must be a JSON object: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async request(config: XmlGateConfig, params: Record<string, string>) {
    if (!config.endpoint) {
      throw new BadRequestException('SAMO XMLGate config is incomplete');
    }

    const url = new URL(config.endpoint);
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
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
      const items = this.parseReferenceItems(raw);

      return {
        url: this.redactUrl(url.toString()),
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        raw: raw.slice(0, 10000),
        items,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestHotelPrices(config: XmlGateConfig, hotelCode: string) {
    const missing = [
      ['SAMO_XMLGATE_USER', config.user],
      ['SAMO_XMLGATE_PASSWORD', config.password],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length) {
      throw new BadRequestException(
        `SAMO XMLGate price config is incomplete: ${missing.join(', ')}`,
      );
    }

    const partnerToken = await this.getPartnerToken(config);
    return this.request(config, {
      ...this.buildReferenceParams(config, 'hotelsalepr'),
      hotel: hotelCode,
      partner_token: partnerToken,
    });
  }

  private async getPartnerToken(config: XmlGateConfig) {
    if (this.partnerTokenCache && this.partnerTokenCache.expiresAt > Date.now()) {
      return this.partnerTokenCache.token;
    }

    if (!config.endpoint || !config.user || !config.password || !config.aesKey) {
      throw new BadRequestException('SAMO XMLGate auth config is incomplete');
    }

    const url = new URL(config.endpoint);
    url.searchParams.set('samo_action', 'auth');

    let lastResponsePreview = 'empty response';
    const digests = this.buildPasswordDigestCandidates(config.password, config.aesKey);
    for (const passwordDigest of digests) {
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
        lastResponsePreview = this.getResponsePreview(raw);

        if (!response.ok) {
          throw new BadRequestException(`SAMO XMLGate auth failed: HTTP ${response.status}`);
        }

        const result = this.parseReferenceItems(raw).find((item) => item._type === 'Result');
        const token = result?.partner_token;
        if (!token) {
          continue;
        }

        this.partnerTokenCache = {
          token,
          expiresAt: Date.now() + 45 * 60 * 1000,
        };

        return token;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new BadRequestException(
      `SAMO XMLGate auth response does not contain partner_token after ${digests.length} passwordDigest variants: ${lastResponsePreview}`,
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

    return [...salts].map((salt) => this.encryptPasswordDigest(password, salt, aesKey));
  }

  private getDateSaltValues(date: Date) {
    const values = new Set<string>();
    const offsetsMinutes = [0, 300, 180, 240, 360];

    for (const offsetMinutes of offsetsMinutes) {
      const parts = this.getDateParts(date, offsetMinutes);
      const dateOnly = `${parts.year}-${parts.month}-${parts.day}`;
      const dateTime = `${dateOnly}T${parts.hour}:${parts.minute}:${parts.second}`;
      const minuteDateTime = `${dateOnly}T${parts.hour}:${parts.minute}:00`;
      const spaceDateTime = `${dateOnly} ${parts.hour}:${parts.minute}:${parts.second}`;
      const spaceMinuteDateTime = `${dateOnly} ${parts.hour}:${parts.minute}:00`;
      const compactDate = `${parts.year}${parts.month}${parts.day}`;
      const compactDateTime = `${compactDate}${parts.hour}${parts.minute}${parts.second}`;
      const compactMinuteDateTime = `${compactDate}${parts.hour}${parts.minute}00`;
      const dottedDate = `${parts.day}.${parts.month}.${parts.year}`;

      [
        dateTime,
        minuteDateTime,
        spaceDateTime,
        spaceMinuteDateTime,
        dateOnly,
        compactDate,
        compactDateTime,
        compactMinuteDateTime,
        dottedDate,
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

  private encryptPasswordDigest(password: string, salt: string, aesKey: string) {
    const key = Buffer.from(aesKey, 'hex');
    if (key.length !== 16 && key.length !== 24 && key.length !== 32) {
      throw new BadRequestException('SAMO XMLGate AES key must be 16, 24 or 32 bytes hex');
    }

    const cipher = createCipheriv(`aes-${key.length * 8}-cbc`, key, Buffer.alloc(16));
    return Buffer.concat([
      cipher.update(Buffer.from(`${password}${salt}`, 'utf8')),
      cipher.final(),
    ]).toString('base64');
  }

  private parseReferenceItems(raw: string) {
    const items: Record<string, string>[] = [];
    const tagMatcher = /<([a-zA-Z][\w:-]*)\s+([^<>]*?)\/>/g;

    for (const match of raw.matchAll(tagMatcher)) {
      const [, tagName, attributes] = match;
      if (tagName.toLowerCase() === 'response') {
        continue;
      }

      items.push({
        _type: tagName,
        ...this.parseAttributes(attributes),
      });
    }

    return items;
  }

  private parseAttributes(value: string) {
    const attributes: Record<string, string> = {};
    const matcher = /([\w:-]+)="([^"]*)"/g;

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

  private getResponsePreview(raw: string) {
    return raw.replace(/\s+/g, ' ').trim().slice(0, 500) || 'empty response';
  }

  private pickMinimalHotelPrice(items: Record<string, string>[]) {
    type HotelPrice = { amount: number; currency?: string; raw: Record<string, string> };

    const prices = items
      .filter((item) => item._type === 'hprice' && item.status !== 'D')
      .map<HotelPrice | null>((item) => {
        const amount = Number(String(item.price ?? '').replace(/\s/g, '').replace(',', '.'));
        return Number.isFinite(amount) && amount > 0
          ? {
              amount,
              currency: item.currency,
              raw: item,
            }
          : null;
      })
      .filter((item): item is HotelPrice => Boolean(item));

    return prices.sort((a, b) => a.amount - b.amount)[0] ?? null;
  }

  private async resolveCurrencyAlias(config: XmlGateConfig, currencyId?: string) {
    if (!currencyId || ['0', '-2147483647'].includes(currencyId)) {
      return this.configService.get<string>('SAMO_XMLGATE_DEFAULT_CURRENCY') ?? 'USD';
    }

    try {
      const reference = await this.request(config, this.buildReferenceParams(config, 'currency'));
      const currency = reference.items.find((item) => item.inc === currencyId);
      return (
        currency?.alias ??
        currency?.name ??
        currency?.lname ??
        currency?.code ??
        currencyId
      );
    } catch {
      return currencyId;
    }
  }

  private redactUrl(value: string) {
    return value.replace(/([?&](?:password|pass|pwd|token|partner_token|AES%20KEY|AES\+KEY)=)[^&]*/gi, '$1***');
  }
}
