import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { IntegrationConfigDto } from './dto/integration-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { IntegrationStatus } from './integrations.entity';

@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntegrationsController {
    constructor(private readonly integrationsService: IntegrationsService) { }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async create(@Body() createDto: CreateIntegrationDto) {
        return await this.integrationsService.create(createDto);
    }

    @Get()
    async findAll(
        @Query('search') search?: string,
        @Query('category') category?: string,
        @Query('status') status?: IntegrationStatus,
    ) {
        return await this.integrationsService.findAll({ search, category, status });
    }

    @Get('stats')
    async getStats() {
        return await this.integrationsService.getStats();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return await this.integrationsService.findOne(id);
    }

    @Get('slug/:slug')
    async findBySlug(@Param('slug') slug: string) {
        return await this.integrationsService.findBySlug(slug);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async update(
        @Param('id') id: string,
        @Body() updateDto: UpdateIntegrationDto,
    ) {
        return await this.integrationsService.update(id, updateDto);
    }

    @Patch(':id/config')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async updateConfig(
        @Param('id') id: string,
        @Body() configDto: IntegrationConfigDto,
    ) {
        return await this.integrationsService.updateConfig(id, configDto);
    }

    @Post(':id/connect')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async connect(@Param('id') id: string) {
        return await this.integrationsService.connect(id);
    }

    @Post(':id/disconnect')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async disconnect(@Param('id') id: string) {
        return await this.integrationsService.disconnect(id);
    }

    @Post(':id/test')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async testConnection(@Param('id') id: string) {
        return await this.integrationsService.testConnection(id);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async remove(@Param('id') id: string) {
        await this.integrationsService.remove(id);
        return { message: 'Integration removed successfully' };
    }

    @Post('seed')
    @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    async seed() {
        await this.integrationsService.seed();
        return { message: 'Seed data created successfully' };
    }
}
