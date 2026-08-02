import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
};

type SamoIncomingConfig = {
  enabled: boolean;
  endpoint?: string;
  user?: string;
  password?: string;
  tourId?: string;
  hotelCode?: string;
  hotelName: string;
  roomCode: string;
  roomName: string;
  mealCode: string;
  mealName: string;
  timeoutMs: number;
};

@Injectable()
export class SamoIncomingService {
  private readonly logger = new Logger(SamoIncomingService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendBooking(payload: SamoClaimPayload): Promise<SamoIncomingResult> {
    const config = this.getConfig(payload);
    const source = this.buildSourceMetadata(payload);

    if (!config.enabled) {
      return {
        enabled: false,
        sent: false,
        skippedReason: 'SAMO Incoming integration is disabled',
        source,
      };
    }

    const missing = this.getMissingConfig(config);
    if (missing.length > 0) {
      return {
        enabled: true,
        sent: false,
        skippedReason: `SAMO Incoming config is incomplete: ${missing.join(', ')}`,
        source,
      };
    }

    const claimNumber = this.buildClaimNumber(payload.bookingNumber, payload.createdAt);
    const requestXml = this.buildSoapEnvelope(config, payload, claimNumber);

    try {
      const response = await this.postSoap(config, requestXml);
      return {
        enabled: true,
        sent: true,
        claimNumber,
        requestXml,
        rawResponse: response,
        source,
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
      };
    }
  }

  private getConfig(payload?: SamoClaimPayload): SamoIncomingConfig {
    return {
      enabled: this.isEnabled('SAMO_INCOMING_ENABLED', 'SAMO_ENABLED'),
      endpoint: this.getFirstConfig('SAMO_INCOMING_ENDPOINT', 'SAMO_BASE_URL'),
      user: this.getFirstConfig('SAMO_INCOMING_USER', 'SAMO_USERNAME'),
      password: this.getFirstConfig('SAMO_INCOMING_PASSWORD', 'SAMO_PASSWORD'),
      tourId:
        payload?.incomingTourId ??
        this.configService.get<string>('SAMO_INCOMING_TOUR_ID'),
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
      mealCode: this.configService.get<string>('SAMO_INCOMING_MEAL_CODE') ?? '1',
      mealName: this.configService.get<string>('SAMO_INCOMING_MEAL_NAME') ?? 'RO',
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
      ['SAMO_INCOMING_ENDPOINT', config.endpoint],
      ['SAMO_INCOMING_USER', config.user],
      ['SAMO_INCOMING_PASSWORD', config.password],
      ['SAMO_INCOMING_TOUR_ID', config.tourId],
      ['SAMO_INCOMING_HOTEL_CODE', config.hotelCode],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);
  }

  private async postSoap(config: SamoIncomingConfig, body: string) {
    if (!config.endpoint) {
      throw new Error('SAMO_INCOMING_ENDPOINT is empty');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: 'processClaimlist',
        },
        body,
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

  private buildSoapEnvelope(
    config: SamoIncomingConfig,
    payload: SamoClaimPayload,
    claimNumber: number,
  ) {
    const claimlist = this.buildClaimlist(config, payload, claimNumber);

    return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://www.example.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:processClaimlist>
      <user>${this.escapeXml(config.user ?? '')}</user>
      <password>${this.escapeXml(config.password ?? '')}</password>
      <claimlist><![CDATA[${claimlist}]]></claimlist>
    </ws:processClaimlist>
  </soapenv:Body>
</soapenv:Envelope>`;
  }

  private buildClaimlist(
    config: SamoIncomingConfig,
    payload: SamoClaimPayload,
    claimNumber: number,
  ) {
    const adults = Math.max(1, payload.groupSize ?? 1);
    const dateBeg = payload.travelDate ?? payload.createdAt;
    const dateEnd = this.addDays(dateBeg, Math.max(1, payload.tour.durationDays));
    const hotelInc = claimNumber + 1;
    const people = this.buildPeople(payload, adults);
    const links = people
      .map(
        (person) =>
          `<hotellink inc="${person.inc + 100000}" hotel_inc="${hotelInc}" people_inc="${person.inc}" common="${hotelInc}" />`,
      )
      .join('\n');

    return `<claimlist>
  <claim number="${claimNumber}" action="E" id="${this.escapeXml(payload.bookingNumber)}" cdate="${this.formatSamoDate(payload.createdAt)}" tour="${this.escapeXml(config.tourId ?? '')}" datebeg="${this.formatSamoDate(dateBeg)}" dateend="${this.formatSamoDate(dateEnd)}">
    <note>${this.escapeXml(this.buildNote(payload))}</note>
    <peoples>
${people.map((person) => person.xml).join('\n')}
    </peoples>
    <hotels>
      <hotel inc="${hotelInc}" hcode="${this.escapeXml(config.hotelCode ?? '')}" hname="${this.escapeXml(config.hotelName)}" room="${this.escapeXml(config.roomCode)}" rname="${this.escapeXml(config.roomName)}" htplace="${adults}-0" pname="${adults} PAX" meal="${this.escapeXml(config.mealCode)}" mname="${this.escapeXml(config.mealName)}" checkin="${this.formatSamoDate(dateBeg)}" checkout="${this.formatSamoDate(dateEnd)}" rcount="1" index="0" addinfant="0" netcurrency="0" />
    </hotels>
    <hotellinks>
${links}
    </hotellinks>
  </claim>
</claimlist>`;
  }

  private buildPeople(payload: SamoClaimPayload, count: number) {
    return Array.from({ length: count }, (_, index) => {
      const isMainPerson = index === 0;
      const inc = this.buildPeopleInc(payload.createdAt, index);
      const lname = isMainPerson
        ? `${payload.person.lastName}/${payload.person.firstName}`.toUpperCase()
        : `GUEST/${index + 1}`;
      const human = this.mapHuman(payload.person.sex);
      const born = payload.person.birthDate ?? new Date('1970-01-01T00:00:00.000Z');
      const pserie = isMainPerson ? payload.person.documentSeries ?? '' : '';
      const pnumber = isMainPerson ? payload.person.documentNumber ?? '' : '';

      return {
        inc,
        xml: `      <people inc="${inc}" lname="${this.escapeXml(lname)}" human="${human}" born="${this.formatSamoDate(born)}" pserie="${this.escapeXml(pserie)}" pnumber="${this.escapeXml(pnumber)}" index="${index}" />`,
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

  private parseResponse(response: string) {
    const claimTag = response.match(/<claim\b[^>]*>/i)?.[0];
    if (!claimTag) {
      return {
        message: 'SAMO response does not contain claim result',
      };
    }

    const result = Number(this.readXmlAttribute(claimTag, 'result'));
    return {
      confirmStatus: this.readXmlAttribute(claimTag, 'confirm_status') ?? undefined,
      result: Number.isNaN(result) ? undefined : result,
      comment: this.readXmlAttribute(claimTag, 'comment') ?? undefined,
      message: this.readXmlAttribute(claimTag, 'message') ?? undefined,
    };
  }

  private readXmlAttribute(tag: string, attribute: string) {
    return tag.match(new RegExp(`${attribute}="([^"]*)"`))?.[1] ?? null;
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

  private escapeXml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
