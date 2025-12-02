import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateLogoDto {
  @ApiProperty({ example: '/logo.svg' })
  @IsString()
  dark: string;

  @ApiProperty({ example: '/footer-logo.webp' })
  @IsString()
  light: string;

  @ApiProperty({ example: 'Personal Wings Logo' })
  @IsString()
  alt: string;
}

export class CreateNavigationLinkDto {
  @ApiProperty({ example: 'Pro Line 21 Avionics Training' })
  @IsString()
  text: string;

  @ApiProperty({ example: '/course/pro-line-21-avionics' })
  @IsString()
  href: string;

  @ApiProperty({ example: 'BookOpenCheck' })
  @IsString()
  icon: string;

  @ApiProperty({ example: 'Master Pro Line 21 avionics systems' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 'Featured' })
  @IsString()
  @IsOptional()
  badge?: string;
}

export class CreateSubmenuDto {
  @ApiProperty({ example: 'Training Programs' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Rocket' })
  @IsString()
  icon: string;

  @ApiProperty({ type: [CreateNavigationLinkDto] })
  links: CreateNavigationLinkDto[];
}

export class CreateFeaturedCourseDto {
  @ApiProperty({ example: 'New Jet Pilot Transition Course' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  image: string;

  @ApiProperty({ example: '/course/new-jet-pilot-transition' })
  @IsString()
  href: string;

  @ApiProperty({ example: 'Featured' })
  @IsString()
  badge: string;
}

export class CreateMenuItemDto {
  @ApiProperty({ example: 'Courses' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: '/courses' })
  @IsString()
  @IsOptional()
  href?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  hasDropdown: boolean;

  @ApiProperty({ example: 'GraduationCap' })
  @IsString()
  icon: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: CreateFeaturedCourseDto })
  @IsOptional()
  featured?: CreateFeaturedCourseDto;

  @ApiPropertyOptional({ type: [CreateSubmenuDto] })
  @IsOptional()
  submenus?: CreateSubmenuDto[];
}

export class CreateUserProfileDto {
  @ApiProperty({
    example: 'U',
    description: 'Fallback text for avatar when user has no profile picture',
  })
  @IsString()
  avatarFallback: string;

  @ApiProperty({
    example: '/profile',
    description: 'URL for user profile page',
  })
  @IsString()
  profileLink: string;
}

export class CreateUserMenuItemDto {
  @ApiProperty({ example: 'Home' })
  @IsString()
  icon: string;

  @ApiProperty({ example: 'My Dashboard' })
  @IsString()
  text: string;

  @ApiProperty({ example: '/dashboard' })
  @IsString()
  href: string;

  @ApiProperty({ example: 'View your overview' })
  @IsString()
  description: string;
}

export class CreateHeaderNavigationDto {
  @ApiProperty({ type: CreateLogoDto })
  logo: CreateLogoDto;

  @ApiProperty({
    example: {
      href: '/cart',
    },
    description: 'Cart configuration - only page URL (cart items are dynamic)',
  })
  cart: {
    href: string;
  };

  @ApiProperty({
    example: {
      placeholder: 'What are you looking for?',
      buttonText: 'Search',
      resultsPerPage: 10,
    },
    description: 'Search UI configuration - results are fetched from database',
  })
  search: {
    placeholder: string;
    buttonText: string;
    resultsPerPage: number;
  };

  @ApiProperty({
    example: {
      menuItems: [],
    },
  })
  navigation: {
    menuItems: CreateMenuItemDto[];
  };

  @ApiProperty()
  userMenu: {
    profile: CreateUserProfileDto;
    isLoggedIn: boolean;
    menuItems: CreateUserMenuItemDto[];
    supportLinks: any[];
    settingsLinks: any[];
  };

  @ApiProperty({
    example: {
      text: 'Login',
      href: '/sign-in',
      variant: 'default',
    },
  })
  cta: {
    text: string;
    href: string;
    variant: string;
  };

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateHeaderNavigationDto extends PartialType(
  CreateHeaderNavigationDto,
) {}
