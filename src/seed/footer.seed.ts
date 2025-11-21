// src/seed/footer.seed.ts
import { Footer } from '../modules/footer/entities/footer.entity';

export const defaultFooterData: Partial<Footer> = {
  enabled: true,
  logo: {
    src: '/footer-logo.webp',
    alt: 'Personal Wings Logo',
    width: 140,
    height: 50,
  },
  description: {
    text: 'Into flight simulators? Our friends at Pro Desk Sim have multiple aircraft available for you! All links are affiliate links because we can vouch for their customer support and quality!',
    enabled: true,
  },
  socialMedia: {
    title: 'Follow us on social media',
    enabled: true,
    links: [
      {
        platform: 'facebook',
        icon: 'facebook',
        href: 'https://facebook.com',
        label: 'Follow us on Facebook',
      },
      {
        platform: 'twitter',
        icon: 'twitter',
        href: 'https://twitter.com',
        label: 'Follow us on Twitter',
      },
      {
        platform: 'instagram',
        icon: 'instagram',
        href: 'https://instagram.com',
        label: 'Follow us on Instagram',
      },
      {
        platform: 'linkedin',
        icon: 'linkedin',
        href: 'https://linkedin.com',
        label: 'Follow us on LinkedIn',
      },
    ],
  },
  sections: [
    {
      title: 'LEARNING',
      links: [
        { label: 'All Courses', href: '/course' },
        { label: 'Lessons', href: '/lesson' },
        { label: 'Events', href: '/events' },
        { label: 'Subscription', href: '/subscription' },
      ],
    },
    {
      title: 'SHOP',
      links: [
        { label: 'Browse Shop', href: '/shop' },
        { label: 'My Wishlist', href: '/dashboard/wishlist' },
        { label: 'Order History', href: '/dashboard/order-history' },
      ],
    },
    {
      title: 'COMPANY',
      links: [
        { label: 'About Us', href: '/about-us' },
        { label: 'Blog', href: '/blog' },
        { label: 'Contact', href: '/contact' },
        { label: 'FAQs', href: '/faqs' },
      ],
    },
    {
      title: 'MY ACCOUNT',
      links: [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Profile', href: '/dashboard/profile' },
        { label: 'Enrolled Courses', href: '/dashboard/enrolled-courses' },
        { label: 'Reviews', href: '/dashboard/reviews' },
        { label: 'Settings', href: '/dashboard/settings' },
      ],
    },
  ],
  newsletter: {
    title: 'GET IN TOUCH',
    description: 'We don\'t send spam so don\'t worry.',
    placeholder: 'Email...',
    buttonText: 'Subscribe',
    enabled: true,
  },
  contact: {
    phone: {
      number: '+1234567890',
      display: '+1 (234) 567-890',
      enabled: true,
    },
    email: {
      address: 'info@personalwings.com',
      enabled: true,
    },
    address: {
      street: '123 Aviation Way, Suite 100',
      city: 'Sky Harbor',
      state: 'AZ',
      zip: '85034',
      enabled: true,
    },
    hours: {
      weekday: 'Mon - Fri: 8:00 AM - 6:00 PM',
      weekend: 'Sat - Sun: 9:00 AM - 4:00 PM',
      enabled: true,
    },
  },
  bottomLinks: [
    { label: 'FAQs', href: '/faqs' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Refund Policy', href: '/refund-policy' },
    { label: 'Terms & Conditions', href: '/terms-conditions' },
  ],
  languageSelector: {
    enabled: true,
    currentLanguage: 'English',
    languages: [
      { code: 'en', name: 'English', flag: 'us' },
      { code: 'fr', name: 'Français', flag: 'fr' },
      { code: 'es', name: 'Español', flag: 'es' },
      { code: 'de', name: 'Deutsch', flag: 'de' },
    ],
  },
  copyright: {
    startYear: 1991,
    companyName: 'Personal Wings, Inc.',
    rightsText: 'All Rights Reserved',
    contactLink: {
      text: 'Contact',
      href: '/contact',
    },
  },
  stats: [
    {
      value: 15,
      suffix: 'K+',
      label: 'Active Students',
    },
    {
      value: 200,
      suffix: '+',
      label: 'Training Courses',
    },
    {
      value: 95,
      suffix: '%',
      label: 'Pass Rate',
    },
  ],
  styling: {
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',
    accentColor: '#3b82f6',
    borderColor: '#374151',
    paddingTop: 80,
    paddingBottom: 48,
  },
  seo: {
    footerSchema: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'Personal Wings',
      'url': 'https://personalwings.com',
      'logo': 'https://personalwings.com/footer-logo.webp',
      'contactPoint': {
        '@type': 'ContactPoint',
        'telephone': '+1234567890',
        'contactType': 'customer service',
        'email': 'info@personalwings.com'
      },
      'address': {
        '@type': 'PostalAddress',
        'streetAddress': '123 Aviation Way, Suite 100',
        'addressLocality': 'Sky Harbor',
        'addressRegion': 'AZ',
        'postalCode': '85034',
        'addressCountry': 'US'
      },
      'sameAs': [
        'https://facebook.com',
        'https://twitter.com',
        'https://instagram.com',
        'https://linkedin.com'
      ]
    },
    accessibility: {
      ariaLabels: {
        footer: 'Website footer with company information and links',
        socialLinks: 'Social media links',
        newsletter: 'Newsletter subscription form',
        sections: 'Footer navigation links',
        bottomLinks: 'Legal and policy links',
      },
    },
  },
};