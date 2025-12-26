import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HeaderModule } from './header/header.module';
import { FooterModule } from './footer/footer.module';
import { HomeModule } from './home/home.module';
import { ContactModule } from './contact/contact.module';
import { FaqsModule } from './faqs/faqs.module';
import { RefundPolicyModule } from './refund-policy/refund-policy.module';
import { PrivacyPolicyModule } from './privacy-policy/privacy-policy.module';
import { TermsConditionsModule } from './terms-conditions/terms-conditions.module';
import { AboutUsModule } from './about-us/about-us.module';
import { OverviewModule } from './overview/overview.module';
import { CloudinaryService } from './services/cloudinary.service';

@Module({
  imports: [
    ConfigModule,
    HeaderModule,
    FooterModule,
    HomeModule,
    ContactModule,
    FaqsModule,
    RefundPolicyModule,
    PrivacyPolicyModule,
    TermsConditionsModule,
    AboutUsModule,
    OverviewModule,
  ],
  providers: [CloudinaryService],
  exports: [
    HeaderModule,
    FooterModule,
    HomeModule,
    ContactModule,
    FaqsModule,
    RefundPolicyModule,
    PrivacyPolicyModule,
    TermsConditionsModule,
    AboutUsModule,
    OverviewModule,
    CloudinaryService,
  ],
})
export class CmsModule {}
