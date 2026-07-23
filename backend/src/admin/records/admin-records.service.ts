import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, LeadStatus, Locale, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';
import { AdminRecordCreateDto } from './dto/admin-record-create.dto';
import { AdminRecordUpdateDto } from './dto/admin-record-update.dto';
import { AdminRecordType } from './dto/admin-records-query.dto';

@Injectable()
export class AdminRecordsService {
  constructor(private readonly prisma: PrismaService) {}

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
        await this.prisma.partner.update({ where: { id }, data: { isActive: false } });
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
        email: dto.email,
        passwordHash,
        firstName,
        lastName,
        phone: dto.phone,
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
    if (!dto.slug || !dto.name) {
      throw new BadRequestException('Slug and name are required');
    }

    await this.prisma.partner.create({
      data: {
        slug: dto.slug,
        type: dto.type ?? 'AGENCY',
        email: dto.email,
        phone: dto.phone,
        city: dto.city,
        isActive: dto.isActive ?? true,
        translations: {
          create: [
            {
              locale: Locale.ru,
              name: dto.name,
            },
            {
              locale: Locale.en,
              name: dto.name,
            },
            {
              locale: Locale.uz,
              name: dto.name,
            },
          ],
        },
      },
    });

    return this.list(AdminRecordType.PARTNERS);
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
      role: user.role,
      status: user.status,
      partner: user.partner?.slug ?? null,
      createdAt: user.createdAt,
    }));
  }

  private async listPartners() {
    const partners = await this.prisma.partner.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        translations: { where: { locale: Locale.ru }, take: 1 },
        users: { select: { id: true } },
      },
    });

    return partners.map((partner) => ({
      id: partner.id,
      title: partner.translations[0]?.name ?? partner.slug,
      slug: partner.slug,
      email: partner.email,
      phone: partner.phone,
      type: partner.type,
      city: partner.city,
      isActive: partner.isActive,
      usersCount: partner.users.length,
      createdAt: partner.createdAt,
    }));
  }

  private async listLeads() {
    const leads = await this.prisma.lead.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        country: { include: { translations: { where: { locale: Locale.ru }, take: 1 } } },
        tour: { include: { translations: { where: { locale: Locale.ru }, take: 1 } } },
        service: { include: { translations: { where: { locale: Locale.ru }, take: 1 } } },
      },
    });

    return leads.map((lead) => ({
      id: lead.id,
      title: lead.name,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      type: lead.type,
      sourcePagePath: lead.sourcePagePath,
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
      },
    });

    return bookings.map((booking) => ({
      id: booking.id,
      title: booking.bookingNumber,
      customer: `${booking.firstName} ${booking.lastName}`,
      email: booking.email,
      phone: booking.phone,
      status: booking.status,
      travelDate: booking.travelDate,
      totalPrice: booking.totalPrice?.toString() ?? null,
      currency: booking.currency,
      partner: booking.partner?.translations[0]?.name ?? booking.partner?.slug ?? null,
      tour: booking.tour?.translations[0]?.title ?? null,
      createdAt: booking.createdAt,
    }));
  }

  private async updateUser(id: string, dto: AdminRecordUpdateDto) {
    await this.ensureExists(this.prisma.user.count({ where: { id } }));
    await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.userStatus !== undefined ? { status: dto.userStatus } : {}),
      },
    });
    return this.list(AdminRecordType.USERS);
  }

  private async updatePartner(id: string, dto: AdminRecordUpdateDto) {
    await this.ensureExists(this.prisma.partner.count({ where: { id } }));
    await this.prisma.partner.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
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
}
