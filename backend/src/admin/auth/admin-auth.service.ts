import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthService } from '../../auth/auth.service';
import { LoginDto } from '../../auth/dto/login.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED_ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER];

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async login(dto: LoginDto) {
    const response = await this.authService.login(dto);
    this.ensureAdminRole(response.user.role);
    return response;
  }

  async refresh(dto: RefreshTokenDto) {
    const response = await this.authService.refreshToken(dto);
    this.ensureAdminRole(response.user.role);
    return response;
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        translations: {
          where: {
            locale: 'ru',
          },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    this.ensureAdminRole(user.role);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName:
        user.translations[0]?.displayName ??
        `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      preferredLocale: user.preferredLocale,
    };
  }

  private ensureAdminRole(role: UserRole) {
    if (!ALLOWED_ADMIN_ROLES.includes(role)) {
      throw new UnauthorizedException('Admin access only');
    }
  }
}
