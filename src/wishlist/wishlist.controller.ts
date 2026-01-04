import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  UseGuards,
  Req,
  Body,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Wishlist & Cart')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) { }

  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  async getWishlist(@Req() req) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Post(':courseId')
  @ApiOperation({ summary: 'Add course to wishlist' })
  async addToWishlist(@Param('courseId') courseId: string, @Req() req) {
    return this.wishlistService.addToWishlist(req.user.id, courseId);
  }

  @Delete(':courseId')
  @ApiOperation({ summary: 'Remove from wishlist' })
  async removeFromWishlist(@Param('courseId') courseId: string, @Req() req) {
    return this.wishlistService.removeFromWishlist(req.user.id, courseId);
  }

  @Post('bulk-remove')
  @ApiOperation({ summary: 'Remove multiple courses from wishlist' })
  @ApiResponse({ status: 200, description: 'Courses removed successfully' })
  async bulkRemoveFromWishlist(
    @Body() body: { courseIds: string[] },
    @Req() req,
  ) {
    if (!body.courseIds || !Array.isArray(body.courseIds)) {
      throw new BadRequestException('courseIds must be an array');
    }
    return this.wishlistService.bulkRemoveFromWishlist(
      req.user.id,
      body.courseIds,
    );
  }

  @Get('check/:courseId')
  @ApiOperation({ summary: 'Check if course is in wishlist' })
  @ApiResponse({ status: 200, description: 'Returns whether course is in wishlist' })
  async checkWishlist(@Param('courseId') courseId: string, @Req() req) {
    return this.wishlistService.checkWishlist(req.user.id, courseId);
  }

  // More specific routes must come before less specific ones
  @Get('cart/count')
  @ApiOperation({ summary: 'Get cart item count' })
  @ApiResponse({ status: 200, description: 'Cart count retrieved' })
  async getCartCount(@Req() req) {
    return this.wishlistService.getCartCount(req.user.id);
  }

  @Get('cart')
  @ApiOperation({ summary: 'Get user cart' })
  async getCart(@Req() req) {
    return this.wishlistService.getCart(req.user.id);
  }

  @Post('cart')
  @ApiOperation({ summary: 'Add item to cart' })
  async addToCart(
    @Body()
    body: {
      courseId?: string;
      productId?: string;
      itemId?: string; // Legacy support
      itemType?: 'Course' | 'Product' | 'course' | 'product';
      price?: number; // Optional if courseId/productId provided
      quantity?: number;
    },
    @Req() req,
  ) {
    const itemId = body.courseId || body.productId || body.itemId;
    if (!itemId) {
      throw new BadRequestException(
        'Either courseId, productId, or itemId must be provided',
      );
    }

    return this.wishlistService.addToCart(
      req.user.id,
      itemId,
      body.itemType || (body.courseId ? 'Course' : 'Product'),
      body.price,
      body.quantity,
      body.courseId,
      body.productId,
    );
  }

  @Post('cart/coupon')
  @ApiOperation({ summary: 'Apply coupon to cart' })
  @ApiResponse({ status: 200, description: 'Coupon applied successfully' })
  async applyCoupon(@Body() body: { code: string }, @Req() req) {
    if (!body.code) {
      throw new BadRequestException('Coupon code is required');
    }
    return this.wishlistService.applyCoupon(req.user.id, body.code);
  }

  @Delete('cart/coupon')
  @ApiOperation({ summary: 'Remove coupon from cart' })
  @ApiResponse({ status: 200, description: 'Coupon removed successfully' })
  async removeCoupon(@Req() req) {
    return this.wishlistService.removeCoupon(req.user.id);
  }

  @Delete('cart/:itemId')
  @ApiOperation({ summary: 'Remove from cart' })
  async removeFromCart(@Param('itemId') itemId: string, @Req() req) {
    return this.wishlistService.removeFromCart(req.user.id, itemId);
  }

  @Delete('cart')
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@Req() req) {
    return this.wishlistService.clearCart(req.user.id);
  }

  @Patch('cart/:itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Cart item quantity updated' })
  @ApiResponse({ status: 404, description: 'Cart or item not found' })
  async updateCartItemQuantity(
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
    @Req() req,
  ) {
    return this.wishlistService.updateCartItemQuantity(
      req.user.id,
      itemId,
      body.quantity,
    );
  }
}
