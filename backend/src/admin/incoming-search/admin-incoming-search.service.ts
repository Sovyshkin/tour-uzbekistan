import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AdminIncomingSearchDto } from './dto/admin-incoming-search.dto';

type IncomingSearchConfig = {
  baseUrl?: string;
  user?: string;
  password?: string;
  hotelsPath: string;
  minPricePath: string;
  timeoutMs: number;
};

@Injectable()
export class AdminIncomingSearchService {
  constructor(private readonly configService: ConfigService) {}

  async search(dto: AdminIncomingSearchDto) {
    const config = this.getConfig();
    const missing = this.getMissingConfig(config);

    if (missing.length) {
      return {
        ok: false,
        skippedReason: `SAMO Incoming search config is incomplete: ${missing.join(', ')}`,
        config: this.getSafeConfig(config),
      };
    }

    const params = this.buildParams(dto);
    const hotels = await this.request(config, config.hotelsPath, params);
    const minPrice = this.findPrice(hotels.parsed);
    const sGuid = this.findStringKey(hotels.parsed, 'sGUID') ?? this.findStringKey(hotels.parsed, 'sguid');
    const minPriceDetails = sGuid
      ? await this.request(config, config.minPricePath, { ...params, sGUID: sGuid })
      : null;

    return {
      ok: true,
      config: this.getSafeConfig(config),
      request: {
        hotelsPath: config.hotelsPath,
        minPricePath: config.minPricePath,
        params,
      },
      summary: {
        minPrice,
        sGuid,
      },
      hotels,
      minPriceDetails,
    };
  }

  private getConfig(): IncomingSearchConfig {
    return {
      baseUrl: this.getFirstConfig(
        'SAMO_INCOMING_SEARCH_BASE_URL',
        'SAMO_INCOMING_API_BASE_URL',
        'SAMO_BASE_URL',
      ),
      user: this.getFirstConfig('SAMO_INCOMING_SEARCH_USER', 'SAMO_INCOMING_USER', 'SAMO_USERNAME'),
      password: this.getFirstConfig(
        'SAMO_INCOMING_SEARCH_PASSWORD',
        'SAMO_INCOMING_PASSWORD',
        'SAMO_PASSWORD',
      ),
      hotelsPath:
        this.configService.get<string>('SAMO_INCOMING_SEARCH_HOTELS_PATH') ??
        '/wizard/getHotels',
      minPricePath:
        this.configService.get<string>('SAMO_INCOMING_SEARCH_MIN_PRICE_PATH') ??
        '/wizard/getMinPrice',
      timeoutMs: Number(
        this.configService.get<string>('SAMO_INCOMING_SEARCH_TIMEOUT_MS') ?? 15000,
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

  private getMissingConfig(config: IncomingSearchConfig) {
    return [
      ['SAMO_INCOMING_SEARCH_BASE_URL', config.baseUrl],
      ['SAMO_INCOMING_SEARCH_USER', config.user],
      ['SAMO_INCOMING_SEARCH_PASSWORD', config.password],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);
  }

  private getSafeConfig(config: IncomingSearchConfig) {
    return {
      baseUrl: config.baseUrl,
      hotelsPath: config.hotelsPath,
      minPricePath: config.minPricePath,
      timeoutMs: config.timeoutMs,
      hasUser: Boolean(config.user),
      hasPassword: Boolean(config.password),
    };
  }

  private buildParams(dto: AdminIncomingSearchDto) {
    const extraParams = this.parseExtraParams(dto.extraParams);
    return {
      ...extraParams,
      ...(dto.checkIn ? { checkIn: dto.checkIn } : {}),
      ...(dto.nights ? { nights: String(dto.nights) } : {}),
      ...(dto.adults ? { adults: String(dto.adults) } : {}),
      ...(dto.children !== undefined ? { children: String(dto.children) } : {}),
      ...(dto.currency ? { currency: dto.currency } : {}),
      ...(dto.tourId ? { tour: dto.tourId } : {}),
      ...(dto.hotelCode ? { hotel: dto.hotelCode, hcode: dto.hotelCode } : {}),
      ...(dto.city ? { city: dto.city } : {}),
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

  private async request(
    config: IncomingSearchConfig,
    path: string,
    params: Record<string, string>,
  ) {
    if (!config.baseUrl || !config.user || !config.password) {
      throw new BadRequestException('SAMO Incoming search config is incomplete');
    }

    const url = new URL(path.replace(/^\/+/, ''), `${config.baseUrl.replace(/\/+$/, '')}/`);
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.user}:${config.password}`).toString('base64')}`,
          Accept: 'application/json, text/plain, */*',
        },
        signal: controller.signal,
      });
      const raw = await response.text();
      const parsed = this.parseBody(raw);

      return {
        url: this.redactUrl(url.toString()),
        status: response.status,
        ok: response.ok,
        raw: raw.slice(0, 10000),
        parsed,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseBody(raw: string) {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private redactUrl(value: string) {
    return value.replace(/([?&](?:password|pass|pwd)=)[^&]*/gi, '$1***');
  }

  private findPrice(value: unknown): number | null {
    const candidates = ['minPrice', 'price', 'cost', 'amount', 'total'];
    const found = this.findNumberByKeys(value, candidates);
    return found;
  }

  private findNumberByKeys(value: unknown, keys: string[]): number | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findNumberByKeys(item, keys);
        if (found !== null) {
          return found;
        }
      }

      return null;
    }

    const record = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(record)) {
      if (keys.some((candidate) => candidate.toLowerCase() === key.toLowerCase())) {
        const number = Number(item);
        if (Number.isFinite(number)) {
          return number;
        }
      }
    }

    for (const item of Object.values(record)) {
      const found = this.findNumberByKeys(item, keys);
      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  private findStringKey(value: unknown, targetKey: string): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findStringKey(item, targetKey);
        if (found) {
          return found;
        }
      }

      return null;
    }

    const record = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(record)) {
      if (key.toLowerCase() === targetKey.toLowerCase() && typeof item === 'string') {
        return item;
      }
    }

    for (const item of Object.values(record)) {
      const found = this.findStringKey(item, targetKey);
      if (found) {
        return found;
      }
    }

    return null;
  }
}
