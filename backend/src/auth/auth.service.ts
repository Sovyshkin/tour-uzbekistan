import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PartnerType, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { createAuthTag } from './auth-tag.util';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterPartnerDto } from './dto/register-partner.dto';

type AuthJwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  authTag: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerPartner(dto: RegisterPartnerDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.tin) {
      const existingPartner = await this.prisma.partner.findUnique({
        where: { tin: dto.tin },
      });

      if (existingPartner) {
        throw new ConflictException('Partner with this TIN already exists');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const createdUser = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.PARTNER,
        status: UserStatus.PENDING,
        preferredLocale: dto.preferredLocale,
        partner: {
          create: {
            slug: this.createPartnerSlug(dto.companyName),
            type: dto.partnerType,
            email: dto.email.toLowerCase(),
            phone: dto.phone,
            website: dto.website,
            city: dto.city,
            tin: dto.tin,
            preferredLocale: dto.preferredLocale,
            translations: {
              create: [
                {
                  locale: dto.preferredLocale,
                  name: dto.companyName,
                  description: dto.description,
                },
              ],
            },
          },
        },
      },
      include: {
        partner: true,
      },
    });

    return this.issueTokens(createdUser.id, createdUser.email, createdUser.role);
  }

  async login(dto: LoginDto) {
    const user = await this.authenticateUser(dto);
    return this.issueTokens(user.id, user.email, user.role);
  }

  async loginPartner(dto: LoginDto) {
    const user = await this.authenticateUser(dto);
    if (user.role !== UserRole.PARTNER) {
      throw new UnauthorizedException('Partner account required');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  private async authenticateUser(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    return user;
  }

  async refreshToken(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshTokenHash || user.status === UserStatus.SUSPENDED ||
      payload.authTag !== createAuthTag(user.passwordHash, this.configService.getOrThrow<string>('JWT_SECRET'))) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  private async issueTokens(userId: string, email: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        role: true,
        passwordHash: true,
        status: true,
        partner: {
          select: {
            isActive: true,
            managerPhone: true,
          },
        },
      },
    });

    if (!user || user.status === UserStatus.SUSPENDED ||
      ((user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && user.status !== UserStatus.ACTIVE)) {
      throw new UnauthorizedException('Account is unavailable');
    }

    role = user.role;
    email = user.email;

    const isApproved =
      role !== UserRole.PARTNER ||
      (user?.status === UserStatus.ACTIVE && user.partner?.isActive === true);

    const payload: AuthJwtPayload = {
      sub: userId,
      email,
      role,
      authTag: createAuthTag(user.passwordHash, this.configService.getOrThrow<string>('JWT_SECRET')),
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1d'),
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: {
        id: userId,
        email,
        role,
        status: user.status,
        isApproved,
        managerPhone: user?.partner?.managerPhone ?? null,
      },
    };
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      return await this.jwtService.verifyAsync<AuthJwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private createPartnerSlug(companyName: string) {
    const baseSlug = companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `${baseSlug || 'partner'}-${Date.now()}`;
  }
}
