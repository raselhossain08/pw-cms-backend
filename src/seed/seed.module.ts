// src/seed/seed.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedService } from './seed.service';
import { Header, HeaderSchema } from '../modules/header/entities/header.entity';
import { Footer, FooterSchema } from '../modules/footer/entities/footer.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Header.name, schema: HeaderSchema },
            { name: Footer.name, schema: FooterSchema }
        ])
    ],
    providers: [SeedService],
    exports: [SeedService],
})
export class SeedModule { }
