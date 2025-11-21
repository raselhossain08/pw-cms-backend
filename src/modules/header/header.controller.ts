// src/modules/header/header.controller.ts
import {
    Controller,
    Get,
    Body,
    Patch,
    UseInterceptors,
    Header
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { HeaderService } from './header.service';
import { UpdateHeaderDto } from './dto/update-header.dto';
import { UpdateLogoDto } from './dto/update-logo.dto';
import { UpdateTopBarDto } from './dto/update-topbar.dto';
import { UpdateNavigationDto } from './dto/update-navigation.dto';
import { UpdateMenuOrderDto } from './dto/update-menu-order.dto';
import { HeaderResponseDto } from './dto/header-response.dto';

@ApiTags('Header CMS (Public API)')
@Controller('header')
@UseInterceptors(CacheInterceptor) // Enable caching for performance
export class HeaderController {
    constructor(private readonly headerService: HeaderService) { }

    @Get('active')
    @CacheTTL(300) // Cache for 5 minutes (300 seconds) - improves performance
    @Header('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400')
    @Header('X-Content-Type-Options', 'nosniff')
    @Header('X-Frame-Options', 'DENY')
    @ApiOperation({
        summary: 'Get active header configuration (Public - No auth required)',
        description: 'Retrieves the active header configuration for frontend display. This is a public endpoint accessible without authentication. Cached for 5 minutes for optimal performance.'
    })
    @ApiResponse({
        status: 200,
        description: 'Return active header with caching headers',
        type: HeaderResponseDto
    })
    @ApiResponse({ status: 404, description: 'No active header found' })
    @ApiHeader({
        name: 'Cache-Control',
        description: 'Caching policy for optimal performance',
        required: false,
    })
    findActive() {
        return this.headerService.findActive();
    }

    @Patch('active')
    @ApiOperation({
        summary: 'Update active header configuration (Public - No auth required)',
        description: 'Updates the entire header configuration. This is a public endpoint accessible without authentication.'
    })
    @ApiResponse({
        status: 200,
        description: 'Header updated successfully',
        type: HeaderResponseDto
    })
    @ApiBody({ type: UpdateHeaderDto })
    updateActive(@Body() updateHeaderDto: UpdateHeaderDto) {
        return this.headerService.updateActive(updateHeaderDto);
    }

    @Patch('active/logo')
    @ApiOperation({
        summary: 'Update logo section only (Public - No auth required)',
        description: 'Updates only the logo section of the header. This is a public endpoint accessible without authentication.'
    })
    @ApiResponse({
        status: 200,
        description: 'Logo updated successfully',
        type: HeaderResponseDto
    })
    @ApiBody({ type: UpdateLogoDto })
    updateLogo(@Body() logoDto: UpdateLogoDto) {
        return this.headerService.updateLogo(logoDto);
    }

    @Patch('active/topbar')
    @ApiOperation({
        summary: 'Update topbar section only (Public - No auth required)',
        description: 'Updates only the topbar section of the header. This is a public endpoint accessible without authentication.'
    })
    @ApiResponse({
        status: 200,
        description: 'Topbar updated successfully',
        type: HeaderResponseDto
    })
    @ApiBody({ type: UpdateTopBarDto })
    updateTopBar(@Body() topBarDto: UpdateTopBarDto) {
        return this.headerService.updateTopBar(topBarDto.topBar);
    }

    @Patch('active/navigation')
    @ApiOperation({
        summary: 'Update navigation section only (Public - No auth required)',
        description: 'Updates only the navigation section of the header. This is a public endpoint accessible without authentication.'
    })
    @ApiResponse({
        status: 200,
        description: 'Navigation updated successfully',
        type: HeaderResponseDto
    })
    @ApiBody({ type: UpdateNavigationDto })
    updateNavigation(@Body() navigationDto: UpdateNavigationDto) {
        return this.headerService.updateNavigation(navigationDto.navigation);
    }

    @Patch('active/cart')
    @ApiOperation({
        summary: 'Update cart section only (Public - No auth required)',
        description: 'Updates only the cart section of the header. This is a public endpoint accessible without authentication.'
    })
    @ApiResponse({
        status: 200,
        description: 'Cart updated successfully',
        type: HeaderResponseDto
    })
    updateCart(@Body() cartData: any) {
        return this.headerService.updateCart(cartData);
    }

    @Patch('active/user-menu')
    @ApiOperation({
        summary: 'Update user menu section only (Public - No auth required)',
        description: 'Updates only the user menu section of the header. This is a public endpoint accessible without authentication.'
    })
    @ApiResponse({
        status: 200,
        description: 'User menu updated successfully',
        type: HeaderResponseDto
    })
    updateUserMenu(@Body() userMenuData: any) {
        return this.headerService.updateUserMenu(userMenuData);
    }

    @Patch('active/seo')
    @ApiOperation({
        summary: 'Update SEO section only (Public - No auth required)',
        description: 'Updates only the SEO metadata section of the header including meta tags, Open Graph, and structured data. This is a public endpoint accessible without authentication.'
    })
    @ApiResponse({
        status: 200,
        description: 'SEO metadata updated successfully',
        type: HeaderResponseDto
    })
    updateSEO(@Body() seoDto: any) {
        return this.headerService.updateSEO(seoDto.seo);
    }

    @Patch('active/theme')
    @ApiOperation({
        summary: 'Update theme section only (Public - No auth required)',
        description: 'Updates only the theme configuration section of the header. This is a public endpoint accessible without authentication.'
    })
    @ApiResponse({
        status: 200,
        description: 'Theme updated successfully',
        type: HeaderResponseDto
    })
    updateTheme(@Body() themeData: any) {
        return this.headerService.updateTheme(themeData);
    }

    @Patch('active/menu-order')
    @ApiOperation({
        summary: 'Reorder navigation menu items (Public - No auth required)',
        description: 'Updates the order of navigation menu items. This is a public endpoint accessible without authentication.'
    })
    @ApiResponse({
        status: 200,
        description: 'Menu order updated successfully',
        type: HeaderResponseDto
    })
    @ApiBody({ type: UpdateMenuOrderDto })
    updateMenuOrder(@Body() orderDto: UpdateMenuOrderDto) {
        return this.headerService.updateMenuOrder(orderDto);
    }
}