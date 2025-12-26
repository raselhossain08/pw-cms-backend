import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AircraftService } from './aircraft.service';
import { CreateAircraftDto } from './dto/create-aircraft.dto';
import { UpdateAircraftDto } from './dto/update-aircraft.dto';
import { FilterAircraftDto } from './dto/filter-aircraft.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Aircraft')
@Controller('aircraft')
export class AircraftController {
  constructor(private readonly aircraftService: AircraftService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new aircraft listing' })
  @ApiResponse({ status: 201, description: 'Aircraft created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createAircraftDto: CreateAircraftDto) {
    return this.aircraftService.create(createAircraftDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all aircraft listings with filters' })
  @ApiResponse({ status: 200, description: 'Aircraft listings retrieved' })
  findAll(@Query() filterDto: FilterAircraftDto) {
    return this.aircraftService.findAll(filterDto);
  }

  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get aircraft statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  getStatistics() {
    return this.aircraftService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get aircraft by ID' })
  @ApiResponse({ status: 200, description: 'Aircraft found' })
  @ApiResponse({ status: 404, description: 'Aircraft not found' })
  findOne(@Param('id') id: string) {
    return this.aircraftService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update aircraft listing' })
  @ApiResponse({ status: 200, description: 'Aircraft updated successfully' })
  @ApiResponse({ status: 404, description: 'Aircraft not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id') id: string,
    @Body() updateAircraftDto: UpdateAircraftDto,
  ) {
    return this.aircraftService.update(id, updateAircraftDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete aircraft listing' })
  @ApiResponse({ status: 200, description: 'Aircraft deleted successfully' })
  @ApiResponse({ status: 404, description: 'Aircraft not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id') id: string) {
    return this.aircraftService.remove(id);
  }

  @Patch(':id/view')
  @ApiOperation({ summary: 'Increment view count' })
  @ApiResponse({ status: 200, description: 'View count incremented' })
  incrementViews(@Param('id') id: string) {
    return this.aircraftService.incrementViews(id);
  }

  @Patch(':id/inquiry')
  @ApiOperation({ summary: 'Increment inquiry count' })
  @ApiResponse({ status: 200, description: 'Inquiry count incremented' })
  incrementInquiries(@Param('id') id: string) {
    return this.aircraftService.incrementInquiries(id);
  }
}
