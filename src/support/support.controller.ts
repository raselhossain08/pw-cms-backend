import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { RateTicketDto } from './dto/rate-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  create(@Body() createTicketDto: CreateTicketDto, @Request() req) {
    return this.supportService.createTicket(createTicketDto, req.user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  findAll(@Query() filters: any) {
    return this.supportService.findAll(filters);
  }

  @Get('my-tickets')
  getUserTickets(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.supportService.getUserTickets(req.user.userId, page, limit);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStats() {
    return this.supportService.getTicketStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.supportService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.supportService.updateTicket(id, updateTicketDto);
  }

  @Post(':id/reply')
  addReply(
    @Param('id') id: string,
    @Body() createReplyDto: CreateReplyDto,
    @Request() req,
  ) {
    const isStaff = [
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
      UserRole.INSTRUCTOR,
    ].includes(req.user.role);
    return this.supportService.addReply(
      id,
      createReplyDto,
      req.user.userId,
      isStaff,
    );
  }

  @Post(':id/rate')
  rate(
    @Param('id') id: string,
    @Body() rateTicketDto: RateTicketDto,
    @Request() req,
  ) {
    return this.supportService.rateTicket(id, rateTicketDto, req.user.userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  close(@Param('id') id: string) {
    return this.supportService.closeTicket(id);
  }
}
