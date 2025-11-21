// src/modules/header/dto/update-header.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateHeaderDto } from './create-header.dto';

export class UpdateHeaderDto extends PartialType(CreateHeaderDto) { }