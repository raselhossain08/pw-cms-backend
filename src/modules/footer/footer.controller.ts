// src/modules/footer/footer.controller.ts
import {
  Controller,
  Get,
  Body,
  Patch,
  Post,
  UseInterceptors,
  Header,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { FooterService } from './footer.service';
import { UpdateFooterDto } from './dto/update-footer.dto';
import {
  UpdateFooterLogoDto as NestedUpdateFooterLogoDto,
  UpdateFooterSocialMediaDto,
  UpdateFooterSectionsDto,
  UpdateFooterNewsletterDto,
  UpdateFooterContactDto,
  UpdateFooterBottomLinksDto,
  UpdateFooterCopyrightDto,
  UpdateFooterStylingDto,
  UpdateFooterSEODto
} from './dto/partial-update-footer.dto';
import { UpdateFooterLogoDto } from './dto/update-logo.dto';
import { 
  NewsletterSubscribeDto, 
  NewsletterUnsubscribeDto,
  NewsletterStatsDto
} from './dto/newsletter.dto';
import { FooterResponseDto } from './dto/footer-response.dto';

@ApiTags('Footer CMS (Public API)')
@Controller('footer')
@UseInterceptors(CacheInterceptor) // Enable caching for performance
export class FooterController {
  constructor(private readonly footerService: FooterService) { }

  @Get('active')
  @CacheTTL(300) // Cache for 5 minutes (300 seconds) - improves performance
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('X-Frame-Options', 'DENY')
  @ApiOperation({
    summary: 'Get active footer configuration (Public - No auth required)',
    description: 'Retrieves the active footer configuration for frontend display. This is a public endpoint accessible without authentication. Cached for 5 minutes for optimal performance.'
  })
  @ApiResponse({
    status: 200,
    description: 'Return active footer with caching headers',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'No active footer found' })
  @ApiHeader({
    name: 'Cache-Control',
    description: 'Caching policy for optimal performance',
    required: false,
  })
  findActive() {
    return this.footerService.findActive();
  }

  @Patch('active')
  @ApiOperation({
    summary: 'Update active footer configuration (Public - No auth required)',
    description: 'Updates the entire footer configuration. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Footer updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: UpdateFooterDto })
  updateActive(@Body() updateFooterDto: UpdateFooterDto) {
    return this.footerService.updateActive(updateFooterDto);
  }

  @Patch('active/logo')
  @ApiOperation({
    summary: 'Update footer logo section only (Public - No auth required)',
    description: 'Updates only the logo section of the footer. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Footer logo updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid logo data' })
  @ApiBody({ type: UpdateFooterLogoDto })
  updateLogo(@Body() logoDto: UpdateFooterLogoDto) {
    return this.footerService.updateLogo(logoDto);
  }

  @Patch('active/social-media')
  @ApiOperation({
    summary: 'Update footer social media section only (Public - No auth required)',
    description: 'Updates only the social media section of the footer. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Social media section updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid social media data' })
  @ApiBody({ type: UpdateFooterSocialMediaDto })
  updateSocialMedia(@Body() socialMediaDto: UpdateFooterSocialMediaDto) {
    return this.footerService.updateSocialMedia(socialMediaDto);
  }

  @Patch('active/sections')
  @ApiOperation({
    summary: 'Update footer link sections only (Public - No auth required)',
    description: 'Updates only the link sections of the footer (e.g., Company, Learning, etc.). This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Footer sections updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid sections data' })
  @ApiBody({ type: UpdateFooterSectionsDto })
  updateSections(@Body() sectionsDto: UpdateFooterSectionsDto) {
    return this.footerService.updateSections(sectionsDto);
  }

  @Patch('active/newsletter')
  @ApiOperation({
    summary: 'Update footer newsletter section only (Public - No auth required)',
    description: 'Updates only the newsletter section of the footer. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Newsletter section updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid newsletter data' })
  @ApiBody({ type: UpdateFooterNewsletterDto })
  updateNewsletter(@Body() newsletterDto: UpdateFooterNewsletterDto) {
    return this.footerService.updateNewsletter(newsletterDto);
  }

  @Patch('active/contact')
  @ApiOperation({
    summary: 'Update footer contact section only (Public - No auth required)',
    description: 'Updates only the contact information section of the footer. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Contact section updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid contact data' })
  @ApiBody({ type: UpdateFooterContactDto })
  updateContact(@Body() contactDto: UpdateFooterContactDto) {
    return this.footerService.updateContact(contactDto);
  }

  @Patch('active/bottom-links')
  @ApiOperation({
    summary: 'Update footer bottom links section only (Public - No auth required)',
    description: 'Updates only the bottom links section of the footer (legal links, etc.). This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Bottom links updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid bottom links data' })
  @ApiBody({ type: UpdateFooterBottomLinksDto })
  updateBottomLinks(@Body() bottomLinksDto: UpdateFooterBottomLinksDto) {
    return this.footerService.updateBottomLinks(bottomLinksDto);
  }

  @Patch('active/copyright')
  @ApiOperation({
    summary: 'Update footer copyright section only (Public - No auth required)',
    description: 'Updates only the copyright section of the footer. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Copyright section updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid copyright data' })
  @ApiBody({ type: UpdateFooterCopyrightDto })
  updateCopyright(@Body() copyrightDto: UpdateFooterCopyrightDto) {
    return this.footerService.updateCopyright(copyrightDto);
  }

  @Patch('active/styling')
  @ApiOperation({
    summary: 'Update footer styling section only (Public - No auth required)',
    description: 'Updates only the styling configuration of the footer (colors, padding, etc.). This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Footer styling updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid styling data' })
  @ApiBody({ type: UpdateFooterStylingDto })
  updateStyling(@Body() stylingDto: UpdateFooterStylingDto) {
    return this.footerService.updateStyling(stylingDto);
  }

  @Patch('active/seo')
  @ApiOperation({
    summary: 'Update footer SEO section only (Public - No auth required)',
    description: 'Updates only the SEO and accessibility configuration of the footer. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Footer SEO configuration updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid SEO data' })
  @ApiBody({ type: UpdateFooterSEODto })
  updateSEO(@Body() seoDto: UpdateFooterSEODto) {
    return this.footerService.updateSEO(seoDto);
  }

  @Patch('active/description')
  @ApiOperation({
    summary: 'Update footer description only (Public - No auth required)',
    description: 'Updates only the description text of the footer. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Footer description updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid description data' })
  updateDescription(@Body() descriptionData: { text: string; enabled: boolean }) {
    return this.footerService.updateDescription(descriptionData);
  }

  @Patch('active/language-selector')
  @ApiOperation({
    summary: 'Update footer language selector only (Public - No auth required)',
    description: 'Updates only the language selector configuration of the footer. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Language selector updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid language selector data' })
  updateLanguageSelector(@Body() languageSelectorData: any) {
    return this.footerService.updateLanguageSelector(languageSelectorData);
  }

  @Patch('active/stats')
  @ApiOperation({
    summary: 'Update footer statistics only (Public - No auth required)',
    description: 'Updates only the statistics section of the footer. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Footer statistics updated successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid stats data' })
  updateStats(@Body() statsData: { stats: any[] }) {
    return this.footerService.updateStats(statsData.stats);
  }

  @Patch('active/toggle')
  @ApiOperation({
    summary: 'Toggle footer enabled/disabled status (Public - No auth required)',
    description: 'Enables or disables the footer display. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Footer status toggled successfully',
    type: FooterResponseDto
  })
  @ApiResponse({ status: 404, description: 'Footer not found' })
  @ApiResponse({ status: 400, description: 'Invalid status data' })
  toggleFooter(@Body() statusData: { enabled: boolean }) {
    return this.footerService.toggleFooter(statusData.enabled);
  }

  // Newsletter Subscription Endpoints

  @Post('newsletter/subscribe')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Subscribe to newsletter (Public - No auth required)',
    description: 'Subscribes an email address to the newsletter. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully subscribed to newsletter',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Successfully subscribed to newsletter' },
        email: { type: 'string', example: 'user@example.com' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid email address or already subscribed' })
  @ApiBody({ type: NewsletterSubscribeDto })
  subscribeNewsletter(@Body() subscribeDto: NewsletterSubscribeDto) {
    return this.footerService.subscribeNewsletter(subscribeDto);
  }

  @Post('newsletter/unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unsubscribe from newsletter (Public - No auth required)',
    description: 'Unsubscribes an email address from the newsletter. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully unsubscribed from newsletter',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Successfully unsubscribed from newsletter' },
        email: { type: 'string', example: 'user@example.com' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid email address or not found' })
  @ApiBody({ type: NewsletterUnsubscribeDto })
  unsubscribeNewsletter(@Body() unsubscribeDto: NewsletterUnsubscribeDto) {
    return this.footerService.unsubscribeNewsletter(unsubscribeDto);
  }

  @Get('newsletter/stats')
  @CacheTTL(600) // Cache for 10 minutes
  @ApiOperation({
    summary: 'Get newsletter statistics (Public - No auth required)',
    description: 'Retrieves newsletter subscription statistics. This is a public endpoint accessible without authentication.'
  })
  @ApiResponse({
    status: 200,
    description: 'Newsletter statistics retrieved successfully',
    type: NewsletterStatsDto
  })
  getNewsletterStats() {
    return this.footerService.getNewsletterStats();
  }
}