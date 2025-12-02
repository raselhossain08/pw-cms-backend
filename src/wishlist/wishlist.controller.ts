import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  Body,
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
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get('wishlist')
  @ApiOperation({ summary: 'Get user wishlist' })
  async getWishlist(@Req() req) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @Post('wishlist/:courseId')
  @ApiOperation({ summary: 'Add course to wishlist' })
  async addToWishlist(@Param('courseId') courseId: string, @Req() req) {
    return this.wishlistService.addToWishlist(req.user.id, courseId);
  }

  @Delete('wishlist/:courseId')
  @ApiOperation({ summary: 'Remove from wishlist' })
  async removeFromWishlist(@Param('courseId') courseId: string, @Req() req) {
    return this.wishlistService.removeFromWishlist(req.user.id, courseId);
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
      itemId: string;
      itemType: 'Course' | 'Product';
      price: number;
      quantity?: number;
    },
    @Req() req,
  ) {
    return this.wishlistService.addToCart(
      req.user.id,
      body.itemId,
      body.itemType,
      body.price,
      body.quantity,
    );
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
}
