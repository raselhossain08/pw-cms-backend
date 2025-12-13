import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AircraftService } from './aircraft.service';
import { AircraftController } from './aircraft.controller';
import { Aircraft, AircraftSchema } from './entities/aircraft.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Aircraft.name, schema: AircraftSchema },
        ]),
    ],
    controllers: [AircraftController],
    providers: [AircraftService],
    exports: [AircraftService],
})
export class AircraftModule { }
