// src/modules/footer/footer.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { FooterController } from './footer.controller';
import { FooterService } from './footer.service';
import { Footer, FooterSchema } from './entities/footer.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Footer.name, schema: FooterSchema }
    ]),
    CacheModule.register({
      ttl: 300, // 5 minutes default cache
      max: 100, // maximum number of items in cache
    }),
  ],
  controllers: [FooterController],
  providers: [FooterService],
  exports: [FooterService], // Export service for use in other modules if needed
})
export class FooterModule {}