import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MenuItemOrder {
    @ApiProperty({
        description: 'Menu item identifier',
        example: 'home'
    })
    id: string;

    @ApiProperty({
        description: 'New position (0-based index)',
        example: 0
    })
    position: number;
}

export class UpdateMenuOrderDto {
    @ApiProperty({
        description: 'Array of menu items with new positions',
        type: [MenuItemOrder]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MenuItemOrder)
    menuItems: MenuItemOrder[];
}
