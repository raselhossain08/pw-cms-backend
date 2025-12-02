import { PartialType } from '@nestjs/swagger';
import { CreateLiveSessionDto } from './create-live-session.dto';

export class UpdateLiveSessionDto extends PartialType(CreateLiveSessionDto) {}
