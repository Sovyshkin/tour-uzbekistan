import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AdminAuditService } from '../audit/admin-audit.service';
import { AdminMediaService } from './admin-media.service';

@ApiTags('admin-media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('admin/media')
export class AdminMediaController {
  constructor(
    private readonly adminMediaService: AdminMediaService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload media file and create media asset' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        group: { type: 'string', example: 'content' },
        altText: { type: 'string' },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ description: 'Created media asset' })
  upload(
    @UploadedFile() file: any,
    @Body('group') group?: string,
    @Body('altText') altText?: string,
    @Req() req?: Request & { user: { sub: string; email: string; role: UserRole } },
  ) {
    return this.adminMediaService.upload(file, group, altText).then(async (asset) => {
      await this.adminAuditService.log({
        user: req?.user,
        request: req,
        action: 'UPLOAD',
        entityType: 'media',
        entityId: asset.id,
        entityTitle: asset.fileName,
        metadata: { group, url: asset.url },
      });
      return asset;
    });
  }
}
