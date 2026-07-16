import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole } from '@prisma/client';

import { AuthResponseDto } from '../../auth/dto/auth-response.dto';
import { LoginDto } from '../../auth/dto/login.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminAuthMeDto } from './dto/admin-auth-me.dto';
import { AdminAuditService } from '../audit/admin-audit.service';
import { AdminAuthService } from './admin-auth.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: UserRole;
  };
};

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login as administrator or manager' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or insufficient role' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const response = await this.adminAuthService.login(dto);
    await this.adminAuditService.log({
      user: {
        sub: response.user.id,
        email: response.user.email,
        role: response.user.role,
      },
      request: req,
      action: 'LOGIN',
      entityType: 'auth',
      entityId: response.user.id,
      entityTitle: response.user.email,
    });
    return response;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh admin access and refresh tokens' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token or insufficient role' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.adminAuthService.refresh(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin user profile' })
  @ApiOkResponse({ type: AdminAuthMeDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  me(@Req() req: AuthenticatedRequest) {
    return this.adminAuthService.me(req.user.sub);
  }
}
