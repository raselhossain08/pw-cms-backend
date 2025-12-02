import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateSocialStatDto {
  @ApiProperty({ example: 'location' })
  @IsString()
  platform: string;

  @ApiProperty({ example: '#' })
  @IsString()
  href: string;

  @ApiProperty({ example: 'New York, USA' })
  @IsString()
  count: string;

  @ApiPropertyOptional({ example: 'Location' })
  @IsString()
  @IsOptional()
  label?: string;
}

export class CreateLanguageDto {
  @ApiProperty({ example: 'en' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'English' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  flag: string;
}

export class CreateCurrencyDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'USD' })
  @IsString()
  name: string;
}

export class CreateNewsAnnouncementDto {
  @ApiProperty({ example: 'Hot' })
  @IsString()
  badge: string;

  @ApiProperty({
    example: 'Intro price. Get Personal Wings for Big Sale -95% off.',
  })
  @IsString()
  text: string;

  @ApiProperty({ example: '/icons/hand.svg' })
  @IsString()
  icon: string;
}

export class CreateSocialLinkDto {
  @ApiProperty({ example: 'facebook' })
  @IsString()
  platform: string;

  @ApiProperty({ example: 'https://facebook.com/personalwings' })
  @IsString()
  href: string;
}

export class CreateTopBarDto {
  @ApiPropertyOptional({ type: [CreateSocialStatDto] })
  @IsArray()
  @IsOptional()
  socialStats?: CreateSocialStatDto[];

  @ApiProperty({ type: [CreateLanguageDto] })
  @IsArray()
  languages: CreateLanguageDto[];

  @ApiProperty({ type: [CreateCurrencyDto] })
  @IsArray()
  currencies: CreateCurrencyDto[];

  @ApiProperty({ type: CreateNewsAnnouncementDto })
  news: CreateNewsAnnouncementDto;

  @ApiProperty({ type: [CreateSocialLinkDto] })
  @IsArray()
  socialLinks: CreateSocialLinkDto[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateTopBarDto extends PartialType(CreateTopBarDto) {}
