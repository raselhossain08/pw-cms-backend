import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import {
  Wishlist,
  WishlistSchema,
  Cart,
  CartSchema,
} from './entities/wishlist.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Wishlist.name, schema: WishlistSchema },
      { name: Cart.name, schema: CartSchema },
    ]),
  ],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
