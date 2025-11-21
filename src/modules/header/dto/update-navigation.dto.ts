import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateNavigationDto {
    @ApiProperty({
        description: 'Navigation configuration',
        example: {
            menuItems: [
                {
                    title: 'Home',
                    href: '/',
                    hasDropdown: false,
                    icon: 'home',
                    position: 0
                }
            ]
        }
    })
    @IsObject()
    navigation: any;
}
