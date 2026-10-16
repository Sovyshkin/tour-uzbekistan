import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserRole, UserStatus } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { createAuthTag } from './auth-tag.util';
import { isCmsRole } from './role-policy';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  authTag: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        email: true, role: true, status: true, passwordHash: true, refreshTokenHash: true,
        partnerId: true, partner: { select: { isActive: true } },
      },
    });
    if (!user || !user.refreshTokenHash || user.status === UserStatus.SUSPENDED ||
      (isCmsRole(user.role) && user.status !== UserStatus.ACTIVE) ||
      (user.role === UserRole.PARTNER && (!user.partnerId || user.partner?.isActive !== true)) ||
      payload.authTag !== createAuthTag(user.passwordHash, this.configService.getOrThrow<string>('JWT_SECRET'))) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    return { sub: payload.sub, email: user.email, role: user.role };
  }
}
