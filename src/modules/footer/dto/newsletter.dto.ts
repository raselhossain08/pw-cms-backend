// src/modules/footer/dto/newsletter.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class NewsletterSubscribeDto {
  @ApiProperty({ description: 'Email address to subscribe', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Source of subscription (optional)', example: 'footer' })
  @IsOptional()
  @IsString()
  source?: string;
}

export class NewsletterUnsubscribeDto {
  @ApiProperty({ description: 'Email address to unsubscribe', example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class NewsletterSubscriptionResponseDto {
  @ApiProperty({ description: 'Subscription email', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'Whether subscription is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Subscription date', example: '2024-01-15T10:30:00Z' })
  subscriptionDate: Date;

  @ApiPropertyOptional({ description: 'Source of subscription', example: 'footer' })
  source?: string;
}

export class NewsletterStatsDto {
  @ApiProperty({ description: 'Total number of subscribers', example: 1250 })
  totalSubscribers: number;

  @ApiProperty({ description: 'Active subscribers', example: 1180 })
  activeSubscribers: number;

  @ApiProperty({ description: 'Subscriptions this month', example: 85 })
  monthlySubscriptions: number;

  @ApiProperty({ description: 'Growth rate percentage', example: 12.5 })
  growthRate: number;
}