import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import {
  HeaderNavigation,
  HeaderNavigationSchema,
} from './schemas/header-navigation.schema';
import { TopBar, TopBarSchema } from './schemas/top-bar.schema';
import { HeaderNavigationService } from './services/header-navigation.service';
import { TopBarService } from './services/top-bar.service';
import { CloudinaryService } from '../services/cloudinary.service';
import { HeaderNavigationController } from './controllers/header-navigation.controller';
import { TopBarController } from './controllers/top-bar.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: HeaderNavigation.name, schema: HeaderNavigationSchema },
      { name: TopBar.name, schema: TopBarSchema },
    ]),
  ],
  controllers: [HeaderNavigationController, TopBarController],
  providers: [HeaderNavigationService, TopBarService, CloudinaryService],
  exports: [HeaderNavigationService, TopBarService, CloudinaryService],
})
export class HeaderModule {}
