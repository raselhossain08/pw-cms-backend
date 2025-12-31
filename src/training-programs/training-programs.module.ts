import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainingProgramsService } from './training-programs.service';
import { TrainingProgramsController } from './training-programs.controller';
import {
  TrainingProgram,
  TrainingProgramSchema,
} from './entities/training-program.entity';
import {
  ProgramEnrollment,
  ProgramEnrollmentSchema,
} from './entities/program-enrollment.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TrainingProgram.name, schema: TrainingProgramSchema },
      { name: ProgramEnrollment.name, schema: ProgramEnrollmentSchema },
    ]),
  ],
  controllers: [TrainingProgramsController],
  providers: [TrainingProgramsService],
  exports: [TrainingProgramsService, MongooseModule],
})
export class TrainingProgramsModule {}
