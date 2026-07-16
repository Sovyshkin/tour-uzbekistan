import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

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
        this.prisma.lead.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
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
            createdAt: true,
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
      },
      recentLeads: recentLeads.map((lead) => ({
        ...lead,
        phone: lead.phone ?? null,
        createdAt: lead.createdAt.toISOString(),
      })),
      recentBookings: recentBookings.map((booking) => ({
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        customer: `${booking.firstName} ${booking.lastName}`.trim(),
        status: booking.status,
        createdAt: booking.createdAt.toISOString(),
      })),
    };
  }
}
