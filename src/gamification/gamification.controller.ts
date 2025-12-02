import { Controller, Get, UseGuards, Param, Query, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Gamification')
@Controller('gamification')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('my-points')
  @ApiOperation({ summary: 'Get user points and achievements' })
  @ApiResponse({ status: 200, description: 'User points data' })
  async getMyPoints(@Req() req) {
    return this.gamificationService.getUserPoints(req.user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard' })
  @ApiResponse({ status: 200, description: 'Top users by points' })
  async getLeaderboard(@Query('limit') limit: number = 10) {
    return this.gamificationService.getLeaderboard(limit);
  }
}
