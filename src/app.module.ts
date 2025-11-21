import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HeaderModule } from './modules/header/header.module';
import { FooterModule } from './modules/footer/footer.module';
import { UploadModule } from './modules/upload/upload.module';
import { SystemStatusModule } from './modules/system-status/system-status.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Global caching for performance optimization
    CacheModule.register({
      isGlobal: true,
      ttl: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes default
      max: parseInt(process.env.CACHE_MAX_ITEMS || '100'),
    }),

    // Rate limiting for security and performance
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60000'), // 60 seconds
      limit: parseInt(process.env.THROTTLE_LIMIT || '100'), // 100 requests per minute
    }]),    // Database connection with optimization
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/cms_db',
      {
        connectionFactory: (connection) => {
          // Enable connection pooling for better performance
          connection.plugin((schema) => {
            schema.set('autoIndex', process.env.NODE_ENV !== 'production');
          });
          return connection;
        },
      }
    ),

    // Static file serving with production optimization
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        maxAge: process.env.NODE_ENV === 'production' ? '7d' : '1d', // Cache longer in production
        etag: true,
        lastModified: true,
        setHeaders: (res, path, stat) => {
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Cross-Origin-Resource-Policy', 'cross-origin');

          // Add security headers for uploaded content
          if (process.env.NODE_ENV === 'production') {
            res.header('Cache-Control', 'public, max-age=604800, immutable'); // 7 days
            res.header('X-Content-Type-Options', 'nosniff');
          }
        },
      },
    }),

    HeaderModule,
    FooterModule,
    UploadModule,
    SystemStatusModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
