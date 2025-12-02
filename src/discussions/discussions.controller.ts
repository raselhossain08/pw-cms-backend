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
import { DiscussionsService } from './discussions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Discussions')
@Controller('discussions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Post('course/:courseId')
  @ApiOperation({ summary: 'Create a discussion' })
  @ApiResponse({ status: 201, description: 'Discussion created' })
  async create(
    @Param('courseId') courseId: string,
    @Body() body: { title: string; content: string },
    @Req() req,
  ) {
    return this.discussionsService.createDiscussion(
      courseId,
      req.user.id,
      body,
    );
  }

  @Get('course/:courseId')
  @ApiOperation({ summary: 'Get course discussions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of discussions' })
  async getCourseDiscussions(
    @Param('courseId') courseId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.discussionsService.getCourseDiscussions(courseId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get discussion by ID' })
  @ApiResponse({ status: 200, description: 'Discussion details' })
  async getDiscussion(@Param('id') id: string) {
    return this.discussionsService.getDiscussion(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update discussion' })
  @ApiResponse({ status: 200, description: 'Discussion updated' })
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string },
    @Req() req,
  ) {
    return this.discussionsService.updateDiscussion(id, req.user.id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete discussion' })
  @ApiResponse({ status: 200, description: 'Discussion deleted' })
  async delete(@Param('id') id: string, @Req() req) {
    return this.discussionsService.deleteDiscussion(id, req.user.id);
  }

  @Post(':id/like')
  @ApiOperation({ summary: 'Like/unlike discussion' })
  @ApiResponse({ status: 200, description: 'Discussion liked' })
  async like(@Param('id') id: string, @Req() req) {
    return this.discussionsService.likeDiscussion(id, req.user.id);
  }

  @Post(':id/solved')
  @ApiOperation({ summary: 'Toggle solved status' })
  @ApiResponse({ status: 200, description: 'Status toggled' })
  async toggleSolved(@Param('id') id: string, @Req() req) {
    return this.discussionsService.toggleSolved(id, req.user.id);
  }

  @Post(':id/pin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Pin/unpin discussion' })
  @ApiResponse({ status: 200, description: 'Discussion pinned' })
  async pin(@Param('id') id: string) {
    return this.discussionsService.pinDiscussion(id);
  }

  @Post(':id/replies')
  @ApiOperation({ summary: 'Add reply to discussion' })
  @ApiResponse({ status: 201, description: 'Reply added' })
  async addReply(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req,
  ) {
    return this.discussionsService.addReply(id, req.user.id, body.content);
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'Get discussion replies' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of replies' })
  async getReplies(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.discussionsService.getDiscussionReplies(id, page, limit);
  }

  @Patch('replies/:id')
  @ApiOperation({ summary: 'Update reply' })
  @ApiResponse({ status: 200, description: 'Reply updated' })
  async updateReply(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req,
  ) {
    return this.discussionsService.updateReply(id, req.user.id, body.content);
  }

  @Delete('replies/:id')
  @ApiOperation({ summary: 'Delete reply' })
  @ApiResponse({ status: 200, description: 'Reply deleted' })
  async deleteReply(@Param('id') id: string, @Req() req) {
    return this.discussionsService.deleteReply(id, req.user.id);
  }

  @Post('replies/:id/like')
  @ApiOperation({ summary: 'Like/unlike reply' })
  @ApiResponse({ status: 200, description: 'Reply liked' })
  async likeReply(@Param('id') id: string, @Req() req) {
    return this.discussionsService.likeReply(id, req.user.id);
  }

  @Post('replies/:id/answer')
  @ApiOperation({ summary: 'Mark reply as answer' })
  @ApiResponse({ status: 200, description: 'Reply marked as answer' })
  async markAsAnswer(@Param('id') id: string, @Req() req) {
    return this.discussionsService.markAsAnswer(id, req.user.id);
  }
}
