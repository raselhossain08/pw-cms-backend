import {
  IsString,
  IsMongoId,
  IsArray,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/quiz.entity';

export class QuizQuestionDto {
  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty()
  @IsString()
  question: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  correctAnswer?: string | string[];

  @ApiProperty()
  @IsNumber()
  @Min(1)
  points: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiProperty()
  @IsNumber()
  order: number;
}

export class CreateQuizDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsMongoId()
  courseId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  lessonId?: string;

  @ApiProperty({ type: [QuizQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  attemptsAllowed?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showCorrectAnswers?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowReview?: boolean;
}
