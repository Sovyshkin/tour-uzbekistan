import { Injectable, Logger } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuditQueryDto } from './dto/admin-audit-query.dto';

type AdminUser = {
  sub: string;
  email: string;
  role: UserRole;
};

type AuditLogInput = {
  user?: AdminUser;
  request?: Request;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  metadata?: unknown;
};

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          userId: input.user?.sub,
          userEmail: input.user?.email,
          userRole: input.user?.role,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          entityTitle: input.entityTitle,
          method: input.request?.method,
          path: input.request?.originalUrl ?? input.request?.url,
          ip: this.getIp(input.request),
          userAgent: input.request?.headers['user-agent'],
          metadata: input.metadata === undefined ? undefined : (input.metadata as Prisma.InputJsonValue),
        },
      });
    } catch (error) {
      this.logger.warn(`Audit log failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async list(query: AdminAuditQueryDto) {
    const safePage = Math.max(1, query.page ?? 1);
    const safeLimit = Math.min(100, Math.max(1, query.limit ?? 50));
    const skip = (safePage - 1) * safeLimit;
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  private getIp(request?: Request) {
    if (!request) {
      return undefined;
    }

    const forwardedFor = request.headers['x-forwarded-for'];
    return Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || request.ip;
  }

  private buildWhere(query: AdminAuditQueryDto): Prisma.AdminAuditLogWhereInput {
    const where: Prisma.AdminAuditLogWhereInput = {};

    if (query.action) {
      where.action = query.action;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.userEmail) {
      where.userEmail = {
        contains: query.userEmail,
        mode: 'insensitive',
      };
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    if (query.search) {
      where.OR = [
        { userEmail: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
        { entityTitle: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
        { path: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
