import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HomeSEO, HomeSEOSchema } from './schemas/home-seo.schema';
import { HomeSEOService } from './services/home-seo.service';
import { HomeSEOController } from './controllers/home-seo.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HomeSEO.name, schema: HomeSEOSchema }]),
  ],
  controllers: [HomeSEOController],
  providers: [HomeSEOService],
  exports: [HomeSEOService],
})
export class HomeSEOModule {}
