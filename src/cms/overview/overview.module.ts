import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';
import { Banner, BannerSchema } from '../home/banner/schemas/banner.schema';
import { AboutSection, AboutSectionSchema } from '../home/about-section/schemas/about-section.schema';
import { Events, EventsSchema } from '../home/events/schemas/events.schema';
import { Testimonials, TestimonialsSchema } from '../home/testimonials/schemas/testimonials.schema';
import { Blog, BlogSchema } from '../home/blog/schemas/blog.schema';
import { AboutUs, AboutUsSchema } from '../about-us/schemas/about-us.schema';
import { Contact, ContactSchema } from '../contact/schemas/contact.schema';
import { Faqs, FaqsSchema } from '../faqs/schemas/faqs.schema';
import { PrivacyPolicy, PrivacyPolicySchema } from '../privacy-policy/schemas/privacy-policy.schema';
import { RefundPolicy, RefundPolicySchema } from '../refund-policy/schemas/refund-policy.schema';
import { TermsConditions, TermsConditionsSchema } from '../terms-conditions/schemas/terms-conditions.schema';
import { TopBar, TopBarSchema } from '../header/schemas/top-bar.schema';
import { Footer, FooterSchema } from '../footer/schemas/footer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Banner.name, schema: BannerSchema },
      { name: AboutSection.name, schema: AboutSectionSchema },
      { name: Events.name, schema: EventsSchema },
      { name: Testimonials.name, schema: TestimonialsSchema },
      { name: Blog.name, schema: BlogSchema },
      { name: AboutUs.name, schema: AboutUsSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: Faqs.name, schema: FaqsSchema },
      { name: PrivacyPolicy.name, schema: PrivacyPolicySchema },
      { name: RefundPolicy.name, schema: RefundPolicySchema },
      { name: TermsConditions.name, schema: TermsConditionsSchema },
      { name: TopBar.name, schema: TopBarSchema },
      { name: Footer.name, schema: FooterSchema },
    ]),
  ],
  controllers: [OverviewController],
  providers: [OverviewService],
  exports: [OverviewService],
})
export class OverviewModule { }
