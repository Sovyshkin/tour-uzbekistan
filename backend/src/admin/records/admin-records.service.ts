import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, LeadStatus, Locale, Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminRecordCreateDto } from './dto/admin-record-create.dto';
import { AdminRecordUpdateDto } from './dto/admin-record-update.dto';
import { AdminRecordType } from './dto/admin-records-query.dto';

@Injectable()
export class AdminRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async list(type: AdminRecordType) {
    switch (type) {
      case AdminRecordType.USERS:
        return this.listUsers();
      case AdminRecordType.PARTNERS:
        return this.listPartners();
      case AdminRecordType.LEADS:
        return this.listLeads();
      case AdminRecordType.BOOKINGS:
        return this.listBookings();
      default:
        throw new BadRequestException('Unsupported records type');
    }
  }

  async update(type: AdminRecordType, id: string, dto: AdminRecordUpdateDto) {
    switch (type) {
      case AdminRecordType.USERS:
        return this.updateUser(id, dto);
      case AdminRecordType.PARTNERS:
        return this.updatePartner(id, dto);
      case AdminRecordType.LEADS:
        return this.updateLead(id, dto);
      case AdminRecordType.BOOKINGS:
        return this.updateBooking(id, dto);
      default:
        throw new BadRequestException('Unsupported records type');
    }
  }

  async create(type: AdminRecordType, dto: AdminRecordCreateDto) {
    switch (type) {
      case AdminRecordType.USERS:
        return this.createUser(dto);
      case AdminRecordType.PARTNERS:
        return this.createPartner(dto);
      default:
        throw new BadRequestException('Create is not supported for this records type yet');
    }
  }

  async archive(type: AdminRecordType, id: string) {
    switch (type) {
      case AdminRecordType.USERS:
        await this.ensureExists(this.prisma.user.count({ where: { id } }));
        await this.prisma.user.update({ where: { id }, data: { status: UserStatus.SUSPENDED } });
        return this.list(AdminRecordType.USERS);
      case AdminRecordType.PARTNERS:
        await this.ensureExists(this.prisma.partner.count({ where: { id } }));
        await this.prisma.$transaction([
          this.prisma.partner.update({ where: { id }, data: { isActive: false } }),
          this.prisma.user.updateMany({
            where: { partnerId: id, role: UserRole.PARTNER },
            data: { status: UserStatus.SUSPENDED },
          }),
        ]);
        return this.list(AdminRecordType.PARTNERS);
      case AdminRecordType.LEADS:
        await this.ensureExists(this.prisma.lead.count({ where: { id } }));
        await this.prisma.lead.update({ where: { id }, data: { status: LeadStatus.SPAM } });
        return this.list(AdminRecordType.LEADS);
      case AdminRecordType.BOOKINGS:
        await this.ensureExists(this.prisma.booking.count({ where: { id } }));
        await this.prisma.booking.update({ where: { id }, data: { status: BookingStatus.CANCELLED } });
        return this.list(AdminRecordType.BOOKINGS);
      default:
        throw new BadRequestException('Unsupported records type');
    }
  }

  async updateUserPassword(id: string, password: string, actor: { role: UserRole }) {
    this.ensureSuperAdmin(actor);
    await this.ensureExists(this.prisma.user.count({ where: { id } }));

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        refreshTokenHash: null,
      },
    });

    return this.list(AdminRecordType.USERS);
  }

  async resetPartnerPasswordAndEmail(id: string, actor: { role: UserRole }) {
    this.ensureSuperAdmin(actor);

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        translations: {
          where: { locale: Locale.ru },
          take: 1,
        },
        partner: {
          include: {
            translations: {
              where: { locale: Locale.ru },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Record not found');
    }

    if (user.role !== UserRole.PARTNER) {
      throw new BadRequestException('Password reset email is available only for partner users');
    }

    if (!user.email) {
      throw new BadRequestException('Partner user does not have an email');
    }

    await this.mailService.verifyConfiguration();

    const password = this.generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);
    const name =
      user.translations[0]?.displayName ||
      `${user.firstName} ${user.lastName}`.trim() ||
      user.partner?.translations[0]?.name ||
      user.email;
    const loginUrl = this.getPartnerLoginUrl();

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        refreshTokenHash: null,
      },
    });

    try {
      await this.mailService.sendPartnerPasswordReset({
        email: user.email,
        name,
        password,
        loginUrl,
      });
    } catch (error) {
      await this.prisma.user.update({
        where: { id },
        data: {
          passwordHash: user.passwordHash,
          refreshTokenHash: user.refreshTokenHash,
        },
      });

      throw error;
    }

    return this.list(AdminRecordType.USERS);
  }

  async deleteUser(id: string, actor: { sub: string; role: UserRole }) {
    this.ensureSuperAdmin(actor);

    if (actor.sub === id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('Record not found');
    }

    if (user.role === UserRole.ADMIN) {
      const adminsCount = await this.prisma.user.count({
        where: { role: UserRole.ADMIN },
      });

      if (adminsCount <= 1) {
        throw new BadRequestException('You cannot delete the last admin account');
      }
    }

    await this.prisma.user.delete({ where: { id } });

    return this.list(AdminRecordType.USERS);
  }

  private async createUser(dto: AdminRecordCreateDto) {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }

    const firstName = dto.firstName?.trim() || 'New';
    const lastName = dto.lastName?.trim() || 'User';
    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.create({
      data: {
        email: dto.email.trim(),
        passwordHash,
        firstName,
        lastName,
        phone: dto.phone?.trim() || null,
        preferredLocale: dto.language ?? Locale.ru,
        partnerId: dto.partnerId || null,
        role: dto.role ?? 'MANAGER',
        status: dto.status ?? 'ACTIVE',
        translations: {
          create: [
            {
              locale: Locale.ru,
              displayName: `${firstName} ${lastName}`,
            },
            {
              locale: Locale.en,
              displayName: `${firstName} ${lastName}`,
            },
            {
              locale: Locale.uz,
              displayName: `${firstName} ${lastName}`,
            },
          ],
        },
      },
    });

    return this.list(AdminRecordType.USERS);
  }

  private async createPartner(dto: AdminRecordCreateDto) {
    if (!dto.name) {
      throw new BadRequestException('Name is required');
    }

    const name = dto.name.trim();

    await this.prisma.partner.create({
      data: {
        slug: dto.slug?.trim() || this.createPartnerSlug(name),
        type: dto.type ?? 'AGENCY',
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        managerPhone: dto.managerPhone?.trim() || null,
        city: dto.city?.trim() || null,
        tin: dto.tin?.trim() || null,
        preferredLocale: dto.language ?? Locale.ru,
        isActive: dto.isActive ?? true,
        translations: {
          create: [
            {
              locale: Locale.ru,
              name,
            },
            {
              locale: Locale.en,
              name,
            },
            {
              locale: Locale.uz,
              name,
            },
          ],
        },
      },
    });

    return this.list(AdminRecordType.PARTNERS);
  }

  private createPartnerSlug(name: string) {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${baseSlug || 'partner'}-${Date.now()}`;
  }

  private async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        partner: true,
        translations: { where: { locale: Locale.ru }, take: 1 },
      },
    });

    return users.map((user) => ({
      id: user.id,
      title: user.translations[0]?.displayName ?? `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      language: user.preferredLocale,
      partnerId: user.partnerId,
      partner: user.partner?.slug ?? null,
      createdAt: user.createdAt,
    }));
  }

  private async listPartners() {
    const partners = await this.prisma.partner.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        translations: { where: { locale: Locale.ru }, take: 1 },
        users: {
          orderBy: [{ createdAt: 'desc' }],
          include: {
            translations: { where: { locale: Locale.ru }, take: 1 },
          },
        },
        bookings: {
          orderBy: [{ createdAt: 'desc' }],
          take: 20,
          include: {
            translations: { where: { locale: Locale.ru }, take: 1 },
            tour: {
              include: {
                translations: { where: { locale: Locale.ru }, take: 1 },
              },
            },
          },
        },
        _count: {
          select: {
            bookings: true,
            users: true,
          },
        },
      },
    });

    return partners.map((partner) => {
      const partnerUsers = partner.users.filter((user) => user.role === UserRole.PARTNER);
      const approvalUsers = partnerUsers.length ? partnerUsers : partner.users;
      const hasActivePartnerUser = approvalUsers.some((user) => user.status === UserStatus.ACTIVE);
      const hasSuspendedPartnerUser = approvalUsers.some((user) => user.status === UserStatus.SUSPENDED);
      const approvalStatus =
        !partner.isActive || hasSuspendedPartnerUser
          ? 'SUSPENDED'
          : hasActivePartnerUser
            ? 'APPROVED'
            : 'PENDING';

      return {
        id: partner.id,
        title: partner.translations[0]?.name ?? partner.slug,
        slug: partner.slug,
        email: partner.email,
        phone: partner.phone,
        managerPhone: partner.managerPhone,
        type: partner.type,
        city: partner.city,
        tin: partner.tin,
        language: partner.preferredLocale,
        isActive: partner.isActive,
        approvalStatus,
        isApproved: approvalStatus === 'APPROVED',
        usersCount: partner._count.users,
        bookingsCount: partner._count.bookings,
        pendingUsersCount: partner.users.filter((user) => user.status === UserStatus.PENDING).length,
        users: partner.users.map((user) => ({
          id: user.id,
          title: user.translations[0]?.displayName ?? (`${user.firstName} ${user.lastName}`.trim() || user.email),
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          language: user.preferredLocale,
          createdAt: user.createdAt,
        })),
        bookings: partner.bookings.map((booking) => ({
          id: booking.id,
          title: booking.bookingNumber,
          bookingNumber: booking.bookingNumber,
          customer: `${booking.firstName} ${booking.lastName}`.trim(),
          email: booking.email,
          phone: booking.phone,
          status: booking.status,
          totalPrice: booking.totalPrice?.toString() ?? null,
          currency: booking.currency,
          tour: booking.tour?.translations[0]?.title ?? null,
          specialRequests: booking.translations[0]?.specialRequests ?? null,
          createdAt: booking.createdAt,
        })),
        createdAt: partner.createdAt,
      };
    });
  }

  private async listLeads() {
    const leads = await this.prisma.lead.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        country: { include: { translations: { where: { locale: Locale.ru }, take: 1 } } },
        tour: { include: { translations: { where: { locale: Locale.ru }, take: 1 } } },
        service: { include: { translations: { where: { locale: Locale.ru }, take: 1 } } },
        translations: { where: { locale: Locale.ru }, take: 1 },
      },
    });

    return leads.map((lead) => ({
      id: lead.id,
      title: lead.name,
      audience: lead.audience,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      type: lead.type,
      sourcePagePath: lead.sourcePagePath,
      sourcePageTitle: lead.sourcePageTitle,
      incoming:
        this.readIntegration(lead.metadata) ??
        this.buildMissingIntegration('Lead metadata does not contain SAMO Incoming result'),
      message: lead.translations[0]?.message ?? null,
      countryId: lead.countryId,
      tourId: lead.tourId,
      serviceId: lead.serviceId,
      country: lead.country?.translations[0]?.name ?? null,
      tour: lead.tour?.translations[0]?.title ?? null,
      service: lead.service?.translations[0]?.name ?? null,
      createdAt: lead.createdAt,
    }));
  }

  private async listBookings() {
    const bookings = await this.prisma.booking.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        partner: { include: { translations: { where: { locale: Locale.ru }, take: 1 } } },
        tour: { include: { translations: { where: { locale: Locale.ru }, take: 1 } } },
        country: { include: { translations: { where: { locale: Locale.ru }, take: 1 } } },
        translations: { where: { locale: Locale.ru }, take: 1 },
      },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      title: booking.bookingNumber,
      audience: booking.audience,
      customer: `${booking.firstName} ${booking.lastName}`,
      email: booking.email,
      phone: booking.phone,
      status: booking.status,
      travelDate: booking.travelDate,
      hotelName: booking.hotelName,
      totalPrice: booking.totalPrice?.toString() ?? null,
      currency: booking.currency,
      sourcePagePath: booking.sourcePagePath,
      specialRequests: booking.translations[0]?.specialRequests ?? null,
      snapshot: booking.includedServicesSnapshot,
      incoming:
        this.readIntegration(booking.metadata) ??
        this.buildMissingIntegration('Booking metadata does not contain SAMO Incoming result'),
      countryId: booking.countryId,
      tourId: booking.tourId,
      partnerId: booking.partnerId,
      partner: booking.partner?.translations[0]?.name ?? booking.partner?.slug ?? null,
      country: booking.country?.translations[0]?.name ?? null,
      tour: booking.tour?.translations[0]?.title ?? null,
      createdAt: booking.createdAt,
    }));
  }

  private async updateUser(id: string, dto: AdminRecordUpdateDto) {
    await this.ensureExists(this.prisma.user.count({ where: { id } }));

    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    const displayName = [firstName, lastName].filter(Boolean).join(' ');

    await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email !== undefined ? { email: dto.email.trim() } : {}),
        ...(firstName !== undefined ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.language !== undefined ? { preferredLocale: dto.language } : {}),
        ...(dto.partnerId !== undefined ? { partnerId: dto.partnerId || null } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.userStatus !== undefined ? { status: dto.userStatus } : {}),
        ...(displayName
          ? {
              translations: {
                upsert: [
                  {
                    where: { userId_locale: { userId: id, locale: Locale.ru } },
                    update: { displayName },
                    create: { locale: Locale.ru, displayName },
                  },
                  {
                    where: { userId_locale: { userId: id, locale: Locale.en } },
                    update: { displayName },
                    create: { locale: Locale.en, displayName },
                  },
                  {
                    where: { userId_locale: { userId: id, locale: Locale.uz } },
                    update: { displayName },
                    create: { locale: Locale.uz, displayName },
                  },
                ],
              },
            }
          : {}),
      },
    });
    return this.list(AdminRecordType.USERS);
  }

  private async updatePartner(id: string, dto: AdminRecordUpdateDto) {
    await this.ensureExists(this.prisma.partner.count({ where: { id } }));
    const name = dto.name?.trim();

    await this.prisma.$transaction(async (tx) => {
      await tx.partner.update({
        where: { id },
        data: {
          ...(dto.slug !== undefined ? { slug: dto.slug.trim() } : {}),
          ...(dto.email !== undefined ? { email: dto.email.trim() || null } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
          ...(dto.managerPhone !== undefined ? { managerPhone: dto.managerPhone.trim() || null } : {}),
          ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
          ...(dto.tin !== undefined ? { tin: dto.tin.trim() || null } : {}),
          ...(dto.language !== undefined ? { preferredLocale: dto.language } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(name
            ? {
                translations: {
                  upsert: [
                    {
                      where: { partnerId_locale: { partnerId: id, locale: Locale.ru } },
                      update: { name },
                      create: { locale: Locale.ru, name },
                    },
                    {
                      where: { partnerId_locale: { partnerId: id, locale: Locale.en } },
                      update: { name },
                      create: { locale: Locale.en, name },
                    },
                    {
                      where: { partnerId_locale: { partnerId: id, locale: Locale.uz } },
                      update: { name },
                      create: { locale: Locale.uz, name },
                    },
                  ],
                },
              }
            : {}),
        },
      });

      if (dto.userStatus !== undefined) {
        await tx.user.updateMany({
          where: { partnerId: id, role: UserRole.PARTNER },
          data: { status: dto.userStatus },
        });
      }
    });

    return this.list(AdminRecordType.PARTNERS);
  }

  private async updateLead(id: string, dto: AdminRecordUpdateDto) {
    await this.ensureExists(this.prisma.lead.count({ where: { id } }));
    await this.prisma.lead.update({
      where: { id },
      data: {
        ...(dto.leadStatus !== undefined ? { status: dto.leadStatus } : {}),
      },
    });
    return this.list(AdminRecordType.LEADS);
  }

  private async updateBooking(id: string, dto: AdminRecordUpdateDto) {
    await this.ensureExists(this.prisma.booking.count({ where: { id } }));
    await this.prisma.booking.update({
      where: { id },
      data: {
        ...(dto.bookingStatus !== undefined ? { status: dto.bookingStatus } : {}),
      },
    });
    return this.list(AdminRecordType.BOOKINGS);
  }

  private async ensureExists(countPromise: Promise<number>) {
    const count = await countPromise;

    if (!count) {
      throw new NotFoundException('Record not found');
    }
  }

  private ensureSuperAdmin(actor: { role: UserRole }) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Super admin access only');
    }
  }

  private generatePassword(length = 14) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
  }

  private getPartnerLoginUrl() {
    const baseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      this.configService.get<string>('PUBLIC_SITE_URL') ||
      'https://centrum-holidays.com';
    const normalizedBase = baseUrl.replace(/\/+$/, '');

    return `${normalizedBase}/for-agent?auth=login`;
  }

  private readIntegration(value: Prisma.JsonValue | null | undefined) {
    if (!this.isPlainObject(value) || !this.isPlainObject(value.samoIncoming)) {
      return null;
    }

    return value.samoIncoming;
  }

  private isPlainObject(value: unknown): value is Record<string, Prisma.JsonValue> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private buildMissingIntegration(skippedReason: string) {
    return {
      enabled: null,
      sent: false,
      skippedReason,
    };
  }
}
