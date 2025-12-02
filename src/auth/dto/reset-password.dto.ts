import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-here',
    description: 'Password reset token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'newpassword123', description: 'New password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
