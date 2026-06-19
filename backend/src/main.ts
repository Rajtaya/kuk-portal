import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Known placeholder/example secrets that must never sign real tokens.
const WEAK_JWT_SECRETS = new Set([
  'your-super-secret-jwt-key-change-in-production',
  'kuk-portal-dev-secret-change-in-production',
  'secret', 'changeme', 'jwt-secret', 'your-secret-key',
]);

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32 || WEAK_JWT_SECRETS.has(jwtSecret)) {
    console.error('FATAL: JWT_SECRET must be a strong, unique value of at least 32 characters (known placeholders are rejected).');
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust the edge/Railway proxy only in production. On a directly-exposed dev
  // server, trusting X-Forwarded-* would let any client spoof its IP and protocol.
  app.set('trust proxy', isProd ? 1 : false);

  // --- DDoS / hardening middleware ---
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Strict CSP for API responses in production. Disabled in dev so Swagger UI
    // (which needs inline scripts/styles) keeps working.
    contentSecurityPolicy: isProd ? {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    } : false,
  }));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Photos and documents are served only through authenticated, university-scoped
  // endpoints (GET /api/employees/:id/photo, GET /api/documents/download/:id) — never
  // as unauthenticated static files.
  app.setGlobalPrefix('api');

  const corsEnv = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS;
  if (isProd && !corsEnv) {
    console.error('WARNING: CORS_ORIGIN or CORS_ORIGINS must be set in production. Defaulting to deny all.');
  }
  // Even in dev, use an explicit allowlist instead of reflecting any origin — with
  // credentials enabled, origin reflection would let any site make authenticated calls.
  const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];
  const allowedOrigins = corsEnv ? corsEnv.split(',').map(o => o.trim()) : (isProd ? false : DEV_ORIGINS);
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('KUK Portal API')
      .setDescription('University Employee Management Dashboard API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  const server = await app.listen(process.env.PORT || process.env.BACKEND_PORT || 4000);
  server.setTimeout(30_000);
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}
bootstrap();
