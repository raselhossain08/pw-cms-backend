// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security - Helmet for security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http://localhost:*'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  // Performance - Compression middleware
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Compression level (0-9)
  }));

  // Global validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS with detailed configuration for SEO
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://cms.personalwings.site',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
    exposedHeaders: 'X-Total-Count, X-Page-Count, ETag, Cache-Control',
    maxAge: 3600, // Cache preflight requests for 1 hour
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  });

  // Set global API prefix for better SEO and versioning
  app.setGlobalPrefix('api');

  // Swagger Documentation with enhanced SEO metadata
  const config = new DocumentBuilder()
    .setTitle('CMS API - Personal Wings')
    .setDescription('High-performance Content Management System API with caching and optimization for SEO')
    .setVersion('1.0')
    .setContact('Personal Wings', 'https://personalwings.com', 'info@personalwings.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth()
    .addTag('Header CMS (Public API)', 'Public endpoints for header configuration - Optimized with caching')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'CMS API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  await app.listen(8000);
  console.log(`🚀 Application is running on: http://localhost:8000`);
  console.log(`📚 Swagger documentation: http://localhost:8000/api-docs`);
  console.log(`🔒 Security: Helmet enabled`);
  console.log(`⚡ Performance: Compression enabled`);
  console.log(`🚦 Rate limiting: Throttler enabled`);
}
bootstrap();