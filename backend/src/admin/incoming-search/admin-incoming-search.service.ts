import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AdminIncomingSearchDto } from './dto/admin-incoming-search.dto';

type XmlGateConfig = {
  endpoint?: string;
  form: string;
  aesKey?: string;
  timeoutMs: number;
};

@Injectable()
export class AdminIncomingSearchService {
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

  private redactUrl(value: string) {
    return value.replace(/([?&](?:password|pass|pwd|token|partner_token)=)[^&]*/gi, '$1***');
  }
}
