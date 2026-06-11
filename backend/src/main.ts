import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required');
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  // Photos served statically (images only); documents go through authenticated /api/documents/download/:id
  app.useStaticAssets(join(__dirname, '..', '..', 'uploads', 'photos'), {
    prefix: '/uploads/photos/',
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Security-Policy', "default-src 'none'");
    },
  });
  app.setGlobalPrefix('api');

  const corsEnv = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !corsEnv) {
    console.error('WARNING: CORS_ORIGIN or CORS_ORIGINS must be set in production. Defaulting to deny all.');
  }
  const allowedOrigins = corsEnv ? corsEnv.split(',').map(o => o.trim()) : (isProd ? false : true);
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('KUK Portal API')
      .setDescription('University Employee Management Dashboard API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(process.env.PORT || process.env.BACKEND_PORT || 4000);
}
bootstrap();
