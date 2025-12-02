import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty()
  answer: string | string[];
}

export class SubmitQuizDto {
  @ApiProperty({ type: [QuizAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  timeSpent?: number;
}
