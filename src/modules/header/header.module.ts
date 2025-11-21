// src/modules/header/header.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { HeaderService } from './header.service';
import { HeaderController } from './header.controller';
import { Header, HeaderSchema } from './entities/header.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Header.name, schema: HeaderSchema }
        ]),
        // Enable caching for this module with 5-minute TTL
        CacheModule.register({
            ttl: 300, // 5 minutes in seconds
            max: 100, // Maximum number of items in cache
        }),
    ],
    controllers: [HeaderController],
    providers: [HeaderService],
    exports: [HeaderService],
})
export class HeaderModule { }