import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class BulkDeleteDto {
  @ApiProperty({
    example: ['id1', 'id2', 'id3'],
    description: 'Array of coupon IDs to delete',
  })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  ids: string[];
}

export class BulkToggleDto {
  @ApiProperty({
    example: ['id1', 'id2', 'id3'],
    description: 'Array of coupon IDs to toggle status',
  })
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
