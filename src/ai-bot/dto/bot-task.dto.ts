import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  MinLength,
} from 'class-validator';

export enum TaskType {
  CREATE_TICKET = 'create_ticket',
  SEND_EMAIL = 'send_email',
  UPDATE_ORDER = 'update_order',
  PROCESS_REFUND = 'process_refund',
  ENROLL_STUDENT = 'enroll_student',
  SEND_CERTIFICATE = 'send_certificate',
  SCHEDULE_SESSION = 'schedule_session',
  CUSTOM = 'custom',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateBotTaskDto {
  @IsEnum(TaskType)
  taskType: TaskType;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  taskData: any; // Data needed to execute the task

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsString()
  @IsOptional()
  userId?: string; // User who will benefit from this task

  @IsString()
  @IsOptional()
  conversationId?: string; // Link to bot conversation if applicable

  @IsString()
  @IsOptional()
  scheduledFor?: string; // ISO date string for scheduled tasks
}

export class UpdateBotTaskDto {
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  result?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string; // Admin who takes ownership
}

export class AssignTaskDto {
  @IsString()
  assignedTo: string; // Admin user ID
}

export class BulkAssignTaskDto {
  @IsString({ each: true })
  taskIds: string[];

  @IsString()
  assignedTo: string;
}
