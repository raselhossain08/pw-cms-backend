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
import { SecurityMiddleware } from './shared/middleware/security.middleware';
import { HelmetMiddleware } from './shared/middleware/helmet.middleware';
import { SystemConfigService } from './system-config/system-config.service';
import { SystemConfigModule } from './system-config/system-config.module';
const compression = require('compression');
const hpp = require('hpp');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'], // Production logging
  });
  const configService = app.get(ConfigService);

  // ============ SECURITY LAYER (Configurable) ============
  const securityEnabled =
    configService.get('SECURITY_ENABLED', 'false') === 'true';

  if (securityEnabled) {
    console.log('🔒 Security features ENABLED');

    // 1. Helmet Security Headers
    const helmetMiddleware = new HelmetMiddleware();
    app.use((req, res, next) => helmetMiddleware.use(req, res, next));

    // 2. Security Middleware (Custom)
    const securityMiddleware = new SecurityMiddleware();
    app.use((req, res, next) => securityMiddleware.use(req, res, next));

    // 3. HTTP Parameter Pollution Prevention
    app.use(hpp());

    // 4. Response Compression
    app.use(compression());
  } else {
    console.log('⚠️  Security features DISABLED - Enable from admin panel');
  }

  // Global filters and interceptors
  app.useGlobalFilters(new GlobalExceptionFilter(configService));
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // Enable CORS with strict settings
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
        console.warn(`[SECURITY] Blocked CORS request from: ${origin}`);
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
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
    maxAge: 86400, // 24 hours
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow properties with decorators
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: { target: false },
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

  // Get port for Swagger configuration
  const port = configService.get('PORT', 5000);

  // Swagger Configuration
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
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User management and profiles')
    .addTag('Courses', 'Course and lesson management')
    .addTag('Products', 'Aircraft and product listings')
    .addTag('Orders', 'Order management and processing')
    .addTag('Payments', 'Payment processing and invoices')
    .addTag('Analytics', 'Business intelligence and reporting')
    .addTag('Notifications', 'Messaging and communication')
    .addTag('Uploads', 'File upload and management')
    .addServer(`http://localhost:${port}`, 'Development Server')
    .addServer('https://api.personalwings.com', 'Production Server')
    .setContact(
      'Support',
      'https://personalwings.com/support',
      'support@personalwings.com',
    )
    .setLicense('Commercial', 'https://personalwings.com/license')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Personal Wings API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
    customCss: `
      .swagger-ui .topbar { background-color: #1e40af; }
      .swagger-ui .info hgroup.main h2 { color: #1e40af; }
      .swagger-ui .btn.authorize { background-color: #1e40af; border-color: #1e40af; }
      .swagger-ui .scheme-container { background-color: #f8fafc; }
    `,
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.min.js',
    ],
  });

  await app.init();
  const systemConfigService = app
    .select(SystemConfigModule)
    .get(SystemConfigService, { strict: true });

  const expressApp = app.getHttpAdapter().getInstance();

  // Simple in-memory cache for public config endpoints
  const cache: Record<string, { ts: number; data: any }> = {};
  const cacheTTL = 30 * 1000; // 30 seconds

  expressApp.get(
    `/${apiPrefix}/public/config/nav-menu`,
    async (req: any, res: any) => {
      try {
        const key = 'NAV_MENU';
        const now = Date.now();
        if (cache[key] && now - cache[key].ts < cacheTTL) {
          return res.json({
            success: true,
            message: 'OK',
            data: cache[key].data,
          });
        }
        const raw = await systemConfigService.getValue(key, '[]');
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw || [];
        cache[key] = { ts: now, data };
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
        const now = Date.now();
        const key = 'HEADER_FULL';
        if (cache[key] && now - cache[key].ts < cacheTTL) {
          return res.json({
            success: true,
            message: 'OK',
            data: cache[key].data,
          });
        }
        const logo = await systemConfigService.getValue(
          'HEADER_LOGO',
          null as any,
        );
        const cta = await systemConfigService.getValue(
          'HEADER_CTA',
          null as any,
        );
        const userMenu = await systemConfigService.getValue(
          'USER_MENU',
          null as any,
        );
        const navigation = await systemConfigService.getValue('NAV_MENU', '[]');
        const topBar = await systemConfigService.getValue('TOP_BAR', '{}');
        const parsed = {
          logo: typeof logo === 'string' ? JSON.parse(logo) : logo,
          cta: typeof cta === 'string' ? JSON.parse(cta) : cta,
          userMenu:
            typeof userMenu === 'string' ? JSON.parse(userMenu) : userMenu,
          navigation: {
            menuItems:
              typeof navigation === 'string'
                ? JSON.parse(navigation)
                : navigation || [],
          },
          topBar:
            typeof topBar === 'string' ? JSON.parse(topBar) : topBar || {},
        };
        cache[key] = { ts: now, data: parsed };
        res.json({ success: true, message: 'OK', data: parsed });
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
        const key = 'FAQ_CONTENT';
        const now = Date.now();
        if (cache[key] && now - cache[key].ts < cacheTTL) {
          return res.json({
            success: true,
            message: 'OK',
            data: cache[key].data,
          });
        }
        const faqs = await systemConfigService.getValue(key, '{}');
        const data = typeof faqs === 'string' ? JSON.parse(faqs) : faqs || {};
        cache[key] = { ts: now, data };
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
  await app.listen(port);

  console.log(
    `🚀 Personal Wings Professional Backend running on: http://localhost:${port}/api`,
  );
  console.log(`📚 Swagger Documentation: http://localhost:${port}/api/docs`);
  console.log(
    `🏷️  Environment: ${configService.get('NODE_ENV', 'development')}`,
  );
}
bootstrap();
