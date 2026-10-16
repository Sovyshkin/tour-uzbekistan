import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuperAdminCredentialsService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.configService.get<string>('SUPER_ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.configService.get<string>('SUPER_ADMIN_PASSWORD');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12) {
      throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (at least 12 characters) must be configured');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1::integer AS acquired FROM pg_advisory_xact_lock(215, 1)`;
      const accounts = await tx.user.findMany({ where: { role: UserRole.SUPER_ADMIN } });
      if (accounts.length > 1) throw new Error('More than one super administrator exists; resolve this before startup');

      const account = accounts[0];
      const emailOwner = await tx.user.findUnique({ where: { email } });
      if (emailOwner && account?.id !== emailOwner.id && emailOwner.role !== UserRole.ADMIN) {
        throw new Error('SUPER_ADMIN_EMAIL belongs to another account');
      }
      if (account && emailOwner && emailOwner.id !== account.id) {
        throw new Error('SUPER_ADMIN_EMAIL belongs to another administrator');
      }

      if (!account) {
        const passwordHash = await bcrypt.hash(password, 10);
        if (emailOwner) {
          await tx.user.update({
            where: { id: emailOwner.id },
            data: { role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE, partnerId: null, passwordHash, refreshTokenHash: null },
          });
        } else {
          await tx.user.create({
            data: {
              email, passwordHash, firstName: 'System', lastName: 'Administrator',
              role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE,
            },
          });
        }
        return;
      }

      const passwordChanged = !(await bcrypt.compare(password, account.passwordHash));
      const identityChanged = account.email !== email || account.status !== UserStatus.ACTIVE || account.partnerId !== null;
      if (passwordChanged || identityChanged) {
        await tx.user.update({
          where: { id: account.id },
          data: {
            email, status: UserStatus.ACTIVE, partnerId: null,
            passwordHash: await bcrypt.hash(password, 10),
            refreshTokenHash: null,
          },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
