import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { config as loadEnv } from 'dotenv';
import { createCipheriv, createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

loadEnv();

type XmlItem = Record<string, string>;

type SamoConfig = {
  endpoint: string;
  form: string;
  user: string;
  password: string;
  aesKey: string;
  timeoutMs: number;
  defaultCurrency: string;
};

type ExportRow = {
  tour: string;
  slug: string;
  hotelCode: string;
  hotelName: string;
  room: string;
  placement: string;
  meal: string;
  dateFrom: string;
  dateTo: string;
  nights: string;
  price: string;
  currency: string;
  status: string;
};

const prisma = new PrismaClient();
const configService = new ConfigService();

const readConfig = (): SamoConfig => {
  const endpoint = getFirstConfig(
    'SAMO_XMLGATE_ENDPOINT',
    'SAMO_INCOMING_XMLGATE_ENDPOINT',
    'SAMO_INCOMING_ENDPOINT',
    'SAMO_BASE_URL',
  );
  const user = getFirstConfig('SAMO_XMLGATE_USER', 'SAMO_INCOMING_USER', 'SAMO_USERNAME');
  const password = getFirstConfig('SAMO_XMLGATE_PASSWORD', 'SAMO_INCOMING_PASSWORD', 'SAMO_PASSWORD');
  const aesKey = getFirstConfig('SAMO_XMLGATE_AES_KEY', 'SAMO_AES_KEY');

  const missing = [
    ['SAMO_XMLGATE_ENDPOINT', endpoint],
    ['SAMO_XMLGATE_USER', user],
    ['SAMO_XMLGATE_PASSWORD', password],
    ['SAMO_XMLGATE_AES_KEY', aesKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw new Error(`SAMO config is incomplete: ${missing.join(', ')}`);
  }

  return {
    endpoint: endpoint!,
    form: getFirstConfig('SAMO_XMLGATE_FORM', 'SAMO_INCOMING_FORM') ?? 'http://samo.travel',
    user: user!,
    password: password!,
    aesKey: aesKey!,
    timeoutMs: Number(configService.get<string>('SAMO_XMLGATE_TIMEOUT_MS') ?? 15000),
    defaultCurrency: configService.get<string>('SAMO_XMLGATE_DEFAULT_CURRENCY') ?? 'USD',
  };
};

const getFirstConfig = (...keys: string[]) => {
  for (const key of keys) {
    const value = configService.get<string>(key);
    if (value) {
      return value;
    }
  }
  return undefined;
};

const getPartnerToken = async (config: SamoConfig) => {
  const url = new URL(config.endpoint);
  url.searchParams.set('samo_action', 'auth');
  let lastResponse = '';

  for (const passwordDigest of buildPasswordDigestCandidates(config.password, config.aesKey)) {
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
        throw new Error(`SAMO auth failed: HTTP ${response.status}`);
      }

      const token = raw.match(/partner_token="([^"]+)"/i)?.[1];
      if (token) {
        return token;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`SAMO auth response does not contain partner_token: ${preview(lastResponse)}`);
};

const buildPasswordDigestCandidates = (password: string, aesKey: string) => {
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
    for (const value of getDateSaltValues(date)) {
      salts.add(createHash('md5').update(value).digest('hex'));
    }
  }

  const digests = new Set<string>();
  for (const salt of salts) {
    for (const key of getAesKeyCandidates(aesKey)) {
      digests.add(encryptPasswordDigest(password, salt, key));
    }
  }

  return [...digests];
};

const getDateSaltValues = (date: Date) => {
  const values = new Set<string>();
  const offsetsMinutes = [0, 300, 180, 240, 360];

  for (const offsetMinutes of offsetsMinutes) {
    const parts = getDateParts(date, offsetMinutes);
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
};

const getDateParts = (date: Date, offsetMinutes: number) => {
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
};

const getAesKeyCandidates = (aesKey: string) => {
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
};

const encryptPasswordDigest = (password: string, salt: string, key: Buffer) => {
  const cipher = createCipheriv(`aes-${key.length * 8}-cbc`, key, Buffer.alloc(16));
  return Buffer.concat([
    cipher.update(Buffer.from(`${password}${salt}`, 'utf8')),
    cipher.final(),
  ]).toString('base64');
};

const fetchHotelPrices = async (config: SamoConfig, partnerToken: string, hotelCode: string) => {
  const url = new URL(config.endpoint);
  url.searchParams.set('samo_action', 'reference');
  url.searchParams.set('form', config.form);
  url.searchParams.set('type', 'hotelsalepr');
  url.searchParams.set('laststamp', '0x0000000000000000');
  url.searchParams.set('delstamp', '0x0000000000000000');
  url.searchParams.set('hotel', hotelCode);
  url.searchParams.set('partner_token', partnerToken);
  url.searchParams.set('AES KEY', config.aesKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'text/xml, application/xml, text/plain, */*' },
      signal: controller.signal,
    });
    const raw = await response.text();

    if (!response.ok || /<Error\b/i.test(raw)) {
      throw new Error(`SAMO hotelsalepr failed for hotel ${hotelCode}: ${preview(raw)}`);
    }

    return parseXmlItems(raw);
  } finally {
    clearTimeout(timeout);
  }
};

const parseXmlItems = (raw: string) => {
  const items: XmlItem[] = [];
  const tagMatcher = /<([a-zA-Z][\w:-]*)\s+([^<>]*?)\/>/g;

  for (const match of raw.matchAll(tagMatcher)) {
    const [, tagName, attributes] = match;
    if (tagName.toLowerCase() === 'response') {
      continue;
    }

    items.push({
      _type: tagName,
      ...parseXmlAttributes(attributes),
    });
  }

  return items;
};

const parseXmlAttributes = (value: string) => {
  const attributes: XmlItem = {};
  const matcher = /([\w:-]+)\s*=\s*"([^"]*)"/g;

  for (const match of value.matchAll(matcher)) {
    attributes[match[1]] = decodeXml(match[2]);
  }

  return attributes;
};

const decodeXml = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const readFirst = (item: XmlItem, keys: string[]) => {
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

  return '';
};

const normalizeAmount = (value: string) => {
  const amount = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const formatAmount = (value: number | null) =>
  value === null
    ? ''
    : value.toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        useGrouping: false,
      });

const formatDate = (value: string) => {
  const compact = value.replace(/[^\d]/g, '');
  if (/^\d{8}$/.test(compact)) {
    const year = Number(compact.slice(0, 4));
    if (year >= 1900 && year <= 2200) {
      return `${compact.slice(6, 8)}.${compact.slice(4, 6)}.${compact.slice(0, 4)}`;
    }
    return `${compact.slice(0, 2)}.${compact.slice(2, 4)}.${compact.slice(4, 8)}`;
  }
  return value;
};

const toRow = (tour: { title: string; slug: string; hotelCode: string; hotelName: string }, item: XmlItem, defaultCurrency: string): ExportRow | null => {
  if (item._type?.toLowerCase() !== 'hprice' || item.status?.trim().toUpperCase() === 'D') {
    return null;
  }

  const amount = normalizeAmount(readFirst(item, ['price', 'amount', 'cost', 'total', 'totalprice', 'saleprice']));
  if (amount === null) {
    return null;
  }

  return {
    tour: tour.title,
    slug: tour.slug,
    hotelCode: tour.hotelCode,
    hotelName: tour.hotelName,
    room: readFirst(item, ['roomname', 'room_name', 'roomlname', 'room_lname', 'roomlongname', 'room', 'roominc', 'room_inc']),
    placement: readFirst(item, ['htplacename', 'htplace_name', 'placename', 'place_name', 'place', 'name', 'lname', 'longname', 'htplace', 'htplaceinc', 'htplace_inc']),
    meal: readFirst(item, ['mealname', 'meal_name', 'meallname', 'meal_lname', 'mealdescription', 'meal', 'mealinc', 'meal_inc']),
    dateFrom: formatDate(readFirst(item, ['datebeg', 'date_beg', 'begdate', 'datebegin', 'date_begin', 'datefrom', 'date_from', 'checkin', 'arrival', 'date'])),
    dateTo: formatDate(readFirst(item, ['dateend', 'date_end', 'enddate', 'dateto', 'date_to'])),
    nights: readFirst(item, ['nights', 'night', 'nightsfrom', 'nights_from', 'nightfrom', 'night_from', 'nightsamount', 'nights_amount', 'durationnights', 'duration_nights', 'staynights', 'stay_nights', 'hnights', 'nt']),
    price: formatAmount(amount),
    currency: normalizeCurrency(readFirst(item, ['currency', 'currencyinc', 'currency_inc', 'curr']), defaultCurrency),
    status: item.status ?? '',
  };
};

const normalizeCurrency = (value: string, fallback: string) =>
  !value || /^-?\d+$/.test(value) ? fallback : value;

const csvEscape = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const toCsv = (rows: ExportRow[]) => {
  const headers: Array<keyof ExportRow> = [
    'tour',
    'slug',
    'hotelCode',
    'hotelName',
    'room',
    'placement',
    'meal',
    'dateFrom',
    'dateTo',
    'nights',
    'price',
    'currency',
    'status',
  ];

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');
};

const toMarkdown = (rows: ExportRow[]) => {
  const grouped = new Map<string, ExportRow[]>();
  for (const row of rows) {
    const key = `${row.tour} | hotel ${row.hotelCode}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }

  const lines = [
    '# SAMO Incoming prices',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Total active prices: ${rows.length}`,
    '',
  ];

  for (const [title, groupRows] of grouped) {
    lines.push(`## ${title}`, '');
    lines.push('| Room | Placement | Meal | Dates | Nights | Price | Currency |');
    lines.push('| --- | --- | --- | --- | ---: | ---: | --- |');
    for (const row of groupRows) {
      lines.push(
        `| ${md(row.room)} | ${md(row.placement)} | ${md(row.meal)} | ${md([row.dateFrom, row.dateTo].filter(Boolean).join(' - '))} | ${md(row.nights)} | ${md(row.price)} | ${md(row.currency)} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
};

const md = (value: string) => String(value ?? '').replace(/\|/g, '\\|');

const preview = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 500);

const main = async () => {
  const config = readConfig();
  const tours = await prisma.tour.findMany({
    where: {
      incomingHotelCode: { not: null },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      slug: true,
      incomingHotelCode: true,
      incomingHotelName: true,
      translations: {
        where: { locale: 'ru' },
        select: { title: true },
        take: 1,
      },
    },
  });
  const hotels = new Map<string, { title: string; slug: string; hotelCode: string; hotelName: string }>();

  for (const tour of tours) {
    if (!tour.incomingHotelCode) {
      continue;
    }

    hotels.set(tour.incomingHotelCode, {
      title: tour.translations[0]?.title ?? tour.slug,
      slug: tour.slug,
      hotelCode: tour.incomingHotelCode,
      hotelName: tour.incomingHotelName ?? '',
    });
  }

  if (!hotels.size) {
    throw new Error('No tours with incomingHotelCode were found in DB.');
  }

  const partnerToken = await getPartnerToken(config);
  const rows: ExportRow[] = [];

  for (const hotel of hotels.values()) {
    const items = await fetchHotelPrices(config, partnerToken, hotel.hotelCode);
    rows.push(
      ...items
        .map((item) => toRow(hotel, item, config.defaultCurrency))
        .filter((row): row is ExportRow => Boolean(row)),
    );
  }

  rows.sort(
    (a, b) =>
      a.tour.localeCompare(b.tour, 'ru') ||
      a.room.localeCompare(b.room, 'ru') ||
      a.placement.localeCompare(b.placement, 'ru') ||
      a.dateFrom.localeCompare(b.dateFrom, 'ru') ||
      Number(a.price.replace(',', '.')) - Number(b.price.replace(',', '.')),
  );

  const outputDir = join(process.cwd(), '..', 'output');
  mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = join(outputDir, `samo-prices-${stamp}.csv`);
  const mdPath = join(outputDir, `samo-prices-${stamp}.md`);

  writeFileSync(csvPath, toCsv(rows), 'utf8');
  writeFileSync(mdPath, toMarkdown(rows), 'utf8');

  console.log(`Hotels: ${hotels.size}`);
  console.log(`Active prices: ${rows.length}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Markdown: ${mdPath}`);
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
