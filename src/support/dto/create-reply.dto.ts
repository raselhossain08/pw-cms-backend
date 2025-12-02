import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class CreateReplyDto {
  @IsString()
  message: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}
