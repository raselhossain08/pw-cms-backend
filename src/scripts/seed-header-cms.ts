import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { HeaderNavigationService } from '../cms/header/services/header-navigation.service';
import { TopBarService } from '../cms/header/services/top-bar.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const headerNavigationService = app.get(HeaderNavigationService);
  const topBarService = app.get(TopBarService);

  try {
    // Seed Header Navigation
    console.log('Seeding Header Navigation...');
    const headerNav = await headerNavigationService.create({
      logo: {
        dark: '/logo.svg',
        light: '/footer-logo.webp',
        alt: 'Personal Wings Logo',
      },
      cart: {
        href: '/cart',
      },
      search: {
        placeholder: 'What are you looking for?',
        buttonText: 'Search',
        resultsPerPage: 10,
      },
      navigation: {
        menuItems: [
          {
            title: 'Shop',
            href: '/shop',
            hasDropdown: false,
            icon: 'Store',
          },
          {
            title: 'Courses',
            hasDropdown: true,
            icon: 'GraduationCap',
            description: 'Professional aviation training courses',
            featured: {
              title: 'New Jet Pilot Transition Course',
              description:
                'Master the transition to jet aircraft with comprehensive training',
              image:
                'https://plus.unsplash.com/premium_photo-1682787494977-d013bb5a8773?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=500',
              href: '/course/new-jet-pilot-transition',
              badge: 'Featured',
            },
            submenus: [
              {
                title: 'Training Programs',
                icon: 'Rocket',
                links: [
                  {
                    text: 'Pro Line 21 Avionics Training',
                    href: '/course/pro-line-21-avionics',
                    icon: 'BookOpenCheck',
                    description: 'Master Pro Line 21 avionics systems',
                  },
                  {
                    text: 'Pro Line Fusion Avionics Training',
                    href: '/course/pro-line-fusion-avionics',
                    icon: 'Trophy',
                    description: 'Advanced Pro Line Fusion training',
                  },
                  {
                    text: 'New Jet Pilot Transition Course',
                    href: '/course/new-jet-pilot-transition',
                    icon: 'Plane',
                    description: 'Transition to jet aircraft',
                    badge: 'Featured',
                  },
                  {
                    text: 'Eclipse Jet Transition Course',
                    href: '/course/eclipse-jet-transition',
                    icon: 'Plane',
                    description: 'Eclipse jet-specific training',
                  },
                  {
                    text: 'All Courses',
                    href: '/course',
                    icon: 'BookOpenCheck',
                    description: 'Browse all available courses',
                  },
                ],
              },
            ],
          },
          {
            title: 'About',
            hasDropdown: true,
            icon: 'ShieldCheck',
            description: 'Learn more about us',
            submenus: [
              {
                title: 'Company',
                icon: 'Plane',
                links: [
                  {
                    text: 'About Us',
                    href: '/about-us',
                    icon: 'Users',
                    description: 'Our story and mission',
                  },
                  {
                    text: 'Blog',
                    href: '/blog',
                    icon: 'Newspaper',
                    description: 'Latest news and updates',
                  },
                  {
                    text: 'FAQs',
                    href: '/faqs',
                    icon: 'FileText',
                    description: 'Frequently asked questions',
                  },
                ],
              },
            ],
          },
          {
            title: 'Contact',
            href: '/contact',
            hasDropdown: false,
            icon: 'Mail',
          },
        ],
      },
      userMenu: {
        profile: {
          avatarFallback: 'U',
          profileLink: '/dashboard/profile',
        },
        isLoggedIn: false,
        menuItems: [
          {
            icon: 'Home',
            text: 'My Dashboard',
            href: '/dashboard',
            description: 'View your overview',
          },
          {
            icon: 'ShoppingBag',
            text: 'Enrolled Courses',
            href: '/dashboard/enrolled-courses',
            description: 'Your enrolled courses',
          },
          {
            icon: 'Heart',
            text: 'My Wishlist',
            href: '/dashboard/wishlist',
            description: 'Favorite courses',
          },
          {
            icon: 'ShoppingCart',
            text: 'Order History',
            href: '/dashboard/order-history',
            description: 'View your orders',
          },
          {
            icon: 'Star',
            text: 'My Reviews',
            href: '/dashboard/reviews',
            description: 'Your course reviews',
          },
          {
            icon: 'User',
            text: 'My Profile',
            href: '/dashboard/profile',
            description: 'Manage your profile',
          },
        ],
        supportLinks: [
          {
            icon: 'BookOpen',
            text: 'Help & Support',
            href: '/faqs',
          },
        ],
        settingsLinks: [
          {
            icon: 'Settings',
            text: 'Settings',
            href: '/dashboard/settings',
          },
          {
            icon: 'LogOut',
            text: 'Logout',
            href: '/api/auth/logout',
          },
        ],
      },
      cta: {
        text: 'Login',
        href: '/sign-in',
        variant: 'default',
      },
      isActive: true,
    });

    console.log('Header Navigation seeded successfully!');

    // Seed Top Bar
    console.log('Seeding Top Bar...');
    const topBar = await topBarService.create({
      socialStats: [],
      languages: [
        {
          code: 'en',
          name: 'English',
          flag: 'https://cdn-icons-png.flaticon.com/512/197/197484.png',
        },
        {
          code: 'fr',
          name: 'Français',
          flag: 'https://cdn-icons-png.flaticon.com/512/197/197560.png',
        },
        {
          code: 'de',
          name: 'Deutsch',
          flag: 'https://cdn-icons-png.flaticon.com/512/197/197571.png',
        },
      ],
      currencies: [
        { code: 'USD', name: 'USD' },
        { code: 'EUR', name: 'EUR' },
        { code: 'GBP', name: 'GBP' },
      ],
      news: {
        badge: 'Hot',
        text: 'Intro price. Get Personal Wings for Big Sale -95% off.',
        icon: '/icons/hand.svg',
      },
      socialLinks: [
        { platform: 'facebook', href: 'https://facebook.com/personalwings' },
        { platform: 'tiktok', href: 'https://tiktok.com/@personalwings' },
        {
          platform: 'linkedin',
          href: 'https://linkedin.com/company/personalwings',
        },
        { platform: 'instagram', href: 'https://instagram.com/personalwings' },
      ],
      isActive: true,
    });

    console.log('Top Bar seeded successfully!');

    console.log('✅ All header CMS data seeded successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
