import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SystemConfigService } from './system-config.service';
import {
  CreateConfigDto,
  UpdateConfigDto,
  BulkUpdateConfigDto,
} from './dto/system-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ConfigCategory } from './entities/system-config.entity';

@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  findAll(@Query('category') category?: ConfigCategory) {
    return this.systemConfigService.findAll(category);
  }

  @Get('grouped')
  getByCategory() {
    return this.systemConfigService.getByCategory();
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.systemConfigService.findByKey(key);
  }

  @Post()
  create(@Body() createConfigDto: CreateConfigDto) {
    return this.systemConfigService.create(createConfigDto);
  }

  @Put(':key')
  update(@Param('key') key: string, @Body() updateConfigDto: UpdateConfigDto) {
    return this.systemConfigService.update(key, updateConfigDto);
  }

  @Put('bulk/update')
  bulkUpdate(@Body() updates: BulkUpdateConfigDto[]) {
    return this.systemConfigService.bulkUpdate(updates);
  }

  @Delete(':key')
  delete(@Param('key') key: string) {
    return this.systemConfigService.delete(key);
  }

  @Post(':key/test')
  testConnection(@Param('key') key: string) {
    return this.systemConfigService.testConnection(key);
  }
}
