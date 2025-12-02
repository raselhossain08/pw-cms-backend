import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ReviewType } from './entities/review.entity';
import { Public } from '../shared/decorators/public.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  async create(@Body() createReviewDto: CreateReviewDto, @Req() req) {
    return this.reviewsService.create(createReviewDto, req.user.id);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiQuery({ name: 'type', enum: ReviewType, required: false })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  async findAll(
    @Query('type') type?: ReviewType,
    @Query('itemId') itemId?: string,
    @Query('rating') rating?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findAll({ type, itemId, rating, page, limit });
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get user reviews' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of user reviews' })
  async getUserReviews(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.reviewsService.getUserReviews(req.user.id, page, limit);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiResponse({ status: 200, description: 'Review details' })
  async findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update review' })
  @ApiResponse({ status: 200, description: 'Review updated' })
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Req() req,
  ) {
    return this.reviewsService.update(id, updateReviewDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete review' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  async remove(@Param('id') id: string, @Req() req) {
    return this.reviewsService.remove(id, req.user.id);
  }

  @Post(':id/helpful')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark review as helpful' })
  @ApiResponse({
    status: 200,
    description: 'Review marked/unmarked as helpful',
  })
  async markHelpful(@Param('id') id: string, @Req() req) {
    return this.reviewsService.markHelpful(id, req.user.id);
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reply to a review' })
  @ApiResponse({ status: 200, description: 'Reply added' })
  async reply(
    @Param('id') id: string,
    @Body() replyDto: ReplyReviewDto,
    @Req() req,
  ) {
    return this.reviewsService.replyToReview(
      id,
      replyDto.replyText,
      req.user.id,
    );
  }

  @Get('stats/:itemId')
  @Public()
  @ApiOperation({ summary: 'Get review statistics for an item' })
  @ApiQuery({ name: 'type', enum: ReviewType })
  @ApiResponse({ status: 200, description: 'Review statistics' })
  async getStats(
    @Param('itemId') itemId: string,
    @Query('type') type: ReviewType,
  ) {
    return this.reviewsService.getReviewStats(itemId, type);
  }
}
