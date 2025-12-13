import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';
import {
    ActivityLog,
    ActivityLogSchema,
} from './entities/activity-log.entity';
import { ErrorLog, ErrorLogSchema } from './entities/error-log.entity';
import { AiLog, AiLogSchema } from './entities/ai-log.entity';
import { ChatLog, ChatLogSchema } from './entities/chat-log.entity';
import { SystemLog, SystemLogSchema } from './entities/system-log.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ActivityLog.name, schema: ActivityLogSchema },
            { name: ErrorLog.name, schema: ErrorLogSchema },
            { name: AiLog.name, schema: AiLogSchema },
            { name: ChatLog.name, schema: ChatLogSchema },
            { name: SystemLog.name, schema: SystemLogSchema },
        ]),
        AuthModule,
    ],
    controllers: [ActivityLogsController],
    providers: [ActivityLogsService],
    exports: [ActivityLogsService],
})
export class ActivityLogsModule { }
