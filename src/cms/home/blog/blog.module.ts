import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Blog, BlogSchema } from './schemas/blog.schema';
import { BlogService } from './services/blog.service';
import { BlogController } from './controllers/blog.controller';
import { BlogSeeder } from './seeds/blog.seed';
import { CloudinaryService } from '../../services/cloudinary.service';
import { User, UserSchema } from '../../../users/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Blog.name, schema: BlogSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BlogController],
  providers: [BlogService, CloudinaryService, BlogSeeder],
  exports: [BlogService, BlogSeeder],
})
export class BlogModule {}
