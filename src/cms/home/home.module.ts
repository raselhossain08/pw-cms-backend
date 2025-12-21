import { Module } from '@nestjs/common';
import { BannerModule } from './banner/banner.module';
import { AboutSectionModule } from './about-section/about-section.module';
import { EventsModule } from './events/events.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { BlogModule } from './blog/blog.module';
import { HomeSEOModule } from './seo/home-seo.module';

@Module({
  imports: [
    BannerModule,
    AboutSectionModule,
    EventsModule,
    TestimonialsModule,
    BlogModule,
    HomeSEOModule,
  ],
  exports: [
    BannerModule,
    AboutSectionModule,
    EventsModule,
    TestimonialsModule,
    BlogModule,
    HomeSEOModule,
  ],
})
export class HomeModule { }
