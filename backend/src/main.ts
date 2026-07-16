import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { static as serveStatic } from 'express';
import { join } from 'path';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  const isDevelopment = configService.get<string>('NODE_ENV', 'development') !== 'production';
  const fallbackDevOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
  const allowedOrigins =
    corsOrigin === '*'
      ? true
      : Array.from(
          new Set([
            ...corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean),
            ...(isDevelopment ? fallbackDevOrigins : []),
          ]),
        );

  app.use('/uploads', serveStatic(join(process.cwd(), 'uploads')));
  app.use('/assets', serveStatic(join(process.cwd(), '..', 'front', 'public', 'assets')));
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tour Uzbekistan API')
    .setDescription('Backend API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
}

bootstrap();
