import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { HomeSEOService } from '../services/home-seo.service';
import { CreateHomeSEODto, UpdateHomeSEODto } from '../dto/home-seo.dto';
import { JwtAuthGuard } from '../../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../auth/guards/roles.guard';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { Public } from '../../../../shared/decorators/public.decorator';
import { UserRole } from '../../../../users/entities/user.entity';

@ApiTags('CMS - Home SEO')
@Controller('cms/home/seo')
export class HomeSEOController {
    constructor(private readonly homeSEOService: HomeSEOService) { }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Get homepage SEO configuration' })
    @ApiResponse({ status: 200, description: 'SEO data retrieved successfully' })
    async getSEO() {
        const data = await this.homeSEOService.getSEO();
        return {
            success: true,
            data,
            message: 'Homepage SEO retrieved successfully',
        };
    }

    @Put()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update homepage SEO configuration' })
    @ApiResponse({ status: 200, description: 'SEO updated successfully' })
    async updateSEO(@Body() updateDto: UpdateHomeSEODto) {
        const data = await this.homeSEOService.updateSEO(updateDto);
        return {
            success: true,
            data,
            message: 'Homepage SEO updated successfully',
        };
    }

    @Post('reset')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Reset homepage SEO to defaults' })
    @ApiResponse({ status: 200, description: 'SEO reset successfully' })
    async resetSEO() {
        const data = await this.homeSEOService.resetToDefaults();
        return {
            success: true,
            data,
            message: 'Homepage SEO reset to defaults successfully',
        };
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create homepage SEO configuration' })
    @ApiResponse({ status: 201, description: 'SEO created successfully' })
    async createSEO(@Body() createDto: CreateHomeSEODto) {
        const data = await this.homeSEOService.createSEO(createDto);
        return {
            success: true,
            data,
            message: 'Homepage SEO created successfully',
        };
    }
}
