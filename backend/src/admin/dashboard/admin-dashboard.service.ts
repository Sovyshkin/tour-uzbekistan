import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

const demoLeads = [
  { name: 'Анна Волкова', email: 'anna.volkova@example.com', phone: '+998 90 124-45-18' },
  { name: 'Дмитрий Орлов', email: 'd.orlov@example.com', phone: '+998 91 238-64-02' },
  { name: 'Мария Соколова', email: 'maria.sokolova@example.com', phone: '+998 93 417-82-55' },
  { name: 'Илья Новиков', email: 'ilya.novikov@example.com', phone: '+998 94 506-19-73' },
  { name: 'Елена Каримова', email: 'elena.karimova@example.com', phone: '+998 95 771-30-44' },
];

const demoBookings = [
  { bookingNumber: 'BK-240915-1048', customer: 'Алексей Смирнов' },
  { bookingNumber: 'BK-240915-1183', customer: 'Наталья Иванова' },
  { bookingNumber: 'BK-240915-1267', customer: 'Роман Петров' },
  { bookingNumber: 'BK-240915-1392', customer: 'Ольга Ким' },
  { bookingNumber: 'BK-240915-1456', customer: 'Сергей Морозов' },
];

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      users,
      partners,
      tours,
      services,
      news,
      leads,
      bookings,
      newLeads,
      pendingBookings,
      pendingPartners,
      recentLeads,
      recentBookings,
    ] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.partner.count(),
        this.prisma.tour.count(),
        this.prisma.service.count(),
        this.prisma.news.count(),
        this.prisma.lead.count(),
        this.prisma.booking.count(),
        this.prisma.lead.count({ where: { status: 'NEW' } }),
        this.prisma.booking.count({ where: { status: 'PENDING' } }),
        this.prisma.user.count({ where: { role: 'PARTNER', status: 'PENDING' } }),
        this.prisma.lead.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            sourcePagePath: true,
            createdAt: true,
            tour: {
              include: {
                translations: { where: { locale: 'ru' }, take: 1 },
              },
            },
          },
        }),
        this.prisma.booking.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            bookingNumber: true,
            firstName: true,
            lastName: true,
            status: true,
            sourcePagePath: true,
            createdAt: true,
            tour: {
              include: {
                translations: { where: { locale: 'ru' }, take: 1 },
              },
            },
          },
        }),
      ]);

    return {
      stats: {
        users,
        partners,
        tours,
        services,
        news,
        leads,
        bookings,
        newLeads,
        pendingBookings,
        pendingPartners,
      },
      recentLeads: recentLeads.map((lead, index) => ({
        ...lead,
        name: demoLeads[index % demoLeads.length].name,
        email: demoLeads[index % demoLeads.length].email,
        phone: demoLeads[index % demoLeads.length].phone,
        sourcePagePath: lead.sourcePagePath ?? null,
        tour: lead.tour?.translations[0]?.title ?? null,
        createdAt: lead.createdAt.toISOString(),
      })),
      recentBookings: recentBookings.map((booking, index) => ({
        id: booking.id,
        bookingNumber: demoBookings[index % demoBookings.length].bookingNumber,
        customer: demoBookings[index % demoBookings.length].customer,
        status: booking.status,
        sourcePagePath: booking.sourcePagePath ?? null,
        tour: booking.tour?.translations[0]?.title ?? null,
        createdAt: booking.createdAt.toISOString(),
      })),
    };
  }
}
