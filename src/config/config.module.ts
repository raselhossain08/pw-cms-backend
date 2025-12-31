import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { SecurityConfigService } from './security.config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        '.env.development',
        '.env.production',
        '.env.local',
      ],
    }),
  ],
  providers: [SecurityConfigService],
  exports: [SecurityConfigService, NestConfigModule],
})
export class ConfigModule {}
