/**
 * Footer CMS Seed Data
 * This file contains the default footer data matching the original footer component
 * Use this to populate the CMS with initial data
 */

export const footerSeedData = {
  logo: {
    src: '/footer-logo.webp',
    alt: 'Personal Wings Logo',
    width: 140,
    height: 50,
  },
  socialMedia: {
    title: 'Follow us on social media',
    links: [
      {
        platform: 'facebook',
        href: 'https://facebook.com',
        label: 'Follow us on Facebook',
      },
      {
        platform: 'twitter',
        href: 'https://twitter.com',
        label: 'Follow us on Twitter',
      },
      {
        platform: 'instagram',
        href: 'https://instagram.com',
        label: 'Follow us on Instagram',
      },
      {
        platform: 'linkedin',
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
    description: "We don't send spam so don't worry.",
    placeholder: 'Email...',
    buttonText: 'Subscribe',
  },
  contact: {
    phone: '+1 (234) 567-890',
    phoneHref: 'tel:+1234567890',
    email: 'info@personalwings.com',
    emailHref: 'mailto:info@personalwings.com',
    address: '123 Aviation Way, Suite 100 Sky Harbor, AZ 85034',
    hours: 'Mon - Fri: 8:00 AM - 6:00 PM Sat - Sun: 9:00 AM - 4:00 PM',
  },
  bottomLinks: [
    { label: 'FAQs', href: '/faqs' },
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Refund Policy', href: '/refund-policy' },
    { label: 'Terms & Conditions', href: '/terms-conditions' },
  ],
  languageSelector: {
    currentLanguage: 'English',
    languages: [
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'Français' },
      { code: 'es', name: 'Español' },
      { code: 'de', name: 'Deutsch' },
    ],
  },
  companyInfo: {
    description:
      'Into flight simulators? Our friends at Pro Desk Sim have multiple aircraft available for you! All links are affiliate links because we can vouch for their customer support and quality!',
    foundedYear: '1991',
    companyName: 'Personal Wings, Inc.',
    rightsText: 'All Rights Reserved',
    contactLink: '/contact',
  },
  isActive: true,
};
