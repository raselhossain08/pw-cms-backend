// src/modules/header/dto/header-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class HeaderResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    enabled: boolean;

    @ApiProperty()
    logo: any;

    @ApiProperty()
    cart: any;

    @ApiProperty()
    search: any;

    @ApiProperty()
    navigation: any;

    @ApiProperty()
    userMenu: any;

    @ApiProperty()
    notifications: any;

    @ApiProperty()
    theme: any;

    @ApiProperty()
    announcement: any;

    @ApiProperty()
    cta: any;

    @ApiProperty()
    topBar: any;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}