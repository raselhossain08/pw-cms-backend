import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
  VersioningType,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { ActivityLoggingInterceptor } from './shared/interceptors/activity-logging.interceptor';
import { ActivityLogsService } from './activity-logs/activity-logs.service';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { SecurityConfigService } from './config/security.config';
import { SystemConfigService } from './system-config/system-config.service';
import { SystemConfigModule } from './system-config/system-config.module';
const compression = require('compression');
const hpp = require('hpp');

async function bootstrap() {
  console.time('🚀 Bootstrap Time');
  
  // Create app with minimal logging for faster startup
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn'] 
      : ['error', 'warn', 'log'],
    bodyParser: true,
    abortOnError: false, // Don't abort on non-critical errors during startup
  });
  
  const configService = app.get(ConfigService);

  // Increase body size limits for large file uploads
  const express = require('express');
  app.use(express.json({ limit: '200mb' }));
  app.use(express.urlencoded({ limit: '200mb', extended: true }));

  // ============ OPTIMIZED SECURITY LAYER ============
  console.log('🔒 Security features ENABLED');

  // 1. Security Middleware (Custom)
  const securityConfigService = app.get(SecurityConfigService);
  const securityMiddleware = new SecurityMiddleware(securityConfigService);
  app.use((req, res, next) => securityMiddleware.use(req, res, next));

  // 2. HTTP Parameter Pollution Prevention
  app.use(hpp());

  // 3. Response Compression (with optimized settings)
  app.use(compression({
    level: 6, // Balance between speed and compression ratio
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  }));

  // ============ OPTIMIZED INTERCEPTORS ============
  // Get ActivityLogsService for filter and interceptor
  let activityLogsService: ActivityLogsService;
  try {
    activityLogsService = app.get(ActivityLogsService);
  } catch (e) {
    activityLogsService = null as any;
  }

  app.useGlobalFilters(
    new GlobalExceptionFilter(configService, activityLogsService),
  );

  // Only add essential interceptors
  const interceptors: any[] = [
    new ResponseInterceptor(),
  ];

  // Add rate limiting only in production
  if (process.env.NODE_ENV === 'production') {
    interceptors.push(new RateLimitInterceptor(securityConfigService));
  }

  // Add logging only if needed
  if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
    interceptors.push(new LoggingInterceptor());
  }

  // Add activity logging only if service is available and enabled
  if (activityLogsService && process.env.ENABLE_ACTIVITY_LOGGING === 'true') {
    interceptors.push(new ActivityLoggingInterceptor(activityLogsService));
  }

  app.useGlobalInterceptors(...interceptors);

  // ============ OPTIMIZED CORS ============
  const allowedOrigins = configService
    .get('CORS_ORIGIN', 'http://localhost:3000')
    .split(',');
  const nodeEnv = configService.get('NODE_ENV', 'development');

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, Swagger UI)
      if (!origin) return callback(null, true);

      // In development, allow localhost with any port
      if (nodeEnv === 'development' && origin.startsWith('http://localhost')) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'Cache-Control',
      'Last-Event-ID',
    ],
    exposedHeaders: [
      'X-Total-Count', 
      'X-Page', 
      'X-Limit',
      'Content-Type',
      'Cache-Control',
      'Connection'
    ],
    maxAge: 86400, // 24 hours
  });

  // ============ OPTIMIZED VALIDATION PIPE ============
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: { target: false, value: false }, // Reduce payload size
      disableErrorMessages: process.env.NODE_ENV === 'production', // Disable in prod
    }),
  );

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Enable versioning for API
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  // Get port
  const port = configService.get('PORT', 5000);

  // ============ OPTIMIZED SWAGGER (Only in development) ============
  if (nodeEnv === 'development' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Personal Wings Professional CMS API')
      .setDescription('Complete enterprise CMS for aviation training platform')
      .setVersion('2.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addServer(`http://localhost:${port}`, 'Development Server')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    });
  }

  // ============ OPTIMIZED PUBLIC ROUTES ============
  await app.init();
  const systemConfigService = app
    .select(SystemConfigModule)
    .get(SystemConfigService, { strict: true });

  const expressApp = app.getHttpAdapter().getInstance();

  // Simple in-memory cache with longer TTL
  const cache: Record<string, { ts: number; data: any }> = {};
  const cacheTTL = 60 * 1000; // 60 seconds (increased from 30)

  // Optimized cache helper
  const getCached = async (key: string, fetcher: () => Promise<any>) => {
    const now = Date.now();
    if (cache[key] && now - cache[key].ts < cacheTTL) {
      return cache[key].data;
    }
    const data = await fetcher();
    cache[key] = { ts: now, data };
    return data;
  };

  expressApp.get(
    `/${apiPrefix}/public/config/nav-menu`,
    async (req: any, res: any) => {
      try {
        const data = await getCached('NAV_MENU', async () => {
          const raw = await systemConfigService.getValue('NAV_MENU', '[]');
          return typeof raw === 'string' ? JSON.parse(raw) : raw || [];
        });
        res.json({ success: true, message: 'OK', data });
      } catch (e) {
        res.json({ success: true, message: 'OK', data: [] });
      }
    },
  );

  expressApp.get(
    `/${apiPrefix}/public/config/header`,
    async (req: any, res: any) => {
      try {
        const data = await getCached('HEADER_FULL', async () => {
          const [logo, cta, userMenu, navigation, topBar] = await Promise.all([
            systemConfigService.getValue('HEADER_LOGO', null as any),
            systemConfigService.getValue('HEADER_CTA', null as any),
            systemConfigService.getValue('USER_MENU', null as any),
            systemConfigService.getValue('NAV_MENU', '[]'),
            systemConfigService.getValue('TOP_BAR', '{}'),
          ]);

          return {
            logo: typeof logo === 'string' ? JSON.parse(logo) : logo,
            cta: typeof cta === 'string' ? JSON.parse(cta) : cta,
            userMenu: typeof userMenu === 'string' ? JSON.parse(userMenu) : userMenu,
            navigation: {
              menuItems: typeof navigation === 'string' ? JSON.parse(navigation) : navigation || [],
            },
            topBar: typeof topBar === 'string' ? JSON.parse(topBar) : topBar || {},
          };
        });
        res.json({ success: true, message: 'OK', data });
      } catch (e) {
        res.json({
          success: true,
          message: 'OK',
          data: {
            logo: null,
            cta: null,
            userMenu: null,
            navigation: { menuItems: [] },
          },
        });
      }
    },
  );

  expressApp.get(
    `/${apiPrefix}/public/content/faqs`,
    async (req: any, res: any) => {
      try {
        const data = await getCached('FAQ_CONTENT', async () => {
          const faqs = await systemConfigService.getValue('FAQ_CONTENT', '{}');
          return typeof faqs === 'string' ? JSON.parse(faqs) : faqs || {};
        });
        res.json({ success: true, message: 'OK', data });
      } catch (e) {
        res.json({
          success: true,
          message: 'OK',
          data: { categories: [], items: [] },
        });
      }
    },
  );

  // Start listening
  await app.listen(port);

  console.timeEnd('🚀 Bootstrap Time');
  console.log(
    `🚀 Personal Wings Professional Backend running on: http://localhost:${port}/api`,
  );
  if (nodeEnv === 'development' || process.env.ENABLE_SWAGGER === 'true') {
    console.log(`📚 Swagger Documentation: http://localhost:${port}/api/docs`);
  }
  console.log(`🏷️  Environment: ${nodeEnv}`);
}

bootstrap().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

