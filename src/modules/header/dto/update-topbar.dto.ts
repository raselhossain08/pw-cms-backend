import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateTopBarDto {
    @ApiProperty({
        description: 'Top bar configuration',
        example: {
            enabled: true,
            backgroundColor: '#000000',
            textColor: '#ffffff',
            socialStats: {
                enabled: true,
                items: []
            }
        }
    })
    @IsObject()
    topBar: any;
}
