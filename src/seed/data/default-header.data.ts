// src/modules/seed/data/default-header.data.ts
export const defaultHeaderData = {
    enabled: true,
    logo: {
        dark: "/uploads/images/1763708936221-logo.webp",
        light: "/uploads/images/1763708955031-footer-logo.webp",
        alt: "Personal Wings Logo"
    },
    cart: {
        itemCount: 4,
        href: "/cart",
        items: [
            {
                id: 1,
                title: "Private Pilot License (PPL) Course",
                image: "https://plus.unsplash.com/premium_photo-1682787494977-d013bb5a8773?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                price: 299,
                quantity: 1,
                instructor: "John Smith",
            },
            {
                id: 2,
                title: "Instrument Rating Training",
                image: "https://plus.unsplash.com/premium_photo-1682787494977-d013bb5a8773?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                price: 449,
                quantity: 1,
                instructor: "Sarah Johnson",
            },
            {
                id: 3, // ✅ MISSING
                title: "Commercial Pilot Training",
                image: "https://plus.unsplash.com/premium_photo-1682787494977-d013bb5a8773?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                price: 699,
                quantity: 1,
                instructor: "Mike Davis",
            },
            {
                id: 4, // ✅ MISSING
                title: "Multi-Engine Rating",
                image: "https://plus.unsplash.com/premium_photo-1682787494977-d013bb5a8773?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                price: 549,
                quantity: 1,
                instructor: "Emily Wilson",
            }
        ]
    },
    search: {
        placeholder: "What are you looking for?",
        buttonText: "Search",
        resultsPerPage: 4,
        mockResults: [
            {
                id: 1,
                title: "Private Pilot License (PPL) Course",
                image: "https://plus.unsplash.com/premium_photo-1682787494977-d013bb5a8773?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                price: 299,
                oldPrice: 399,
                rating: 5,
                reviewCount: 24,
            },
            {
                id: 2,
                title: "Instrument Rating Training",
                image: "https://plus.unsplash.com/premium_photo-1682787494977-d013bb5a8773?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                price: 449,
                oldPrice: 599,
                rating: 5,
                reviewCount: 18,
            },
            {
                id: 3, // ✅ MISSING
                title: "Commercial Pilot Training",
                image: "https://plus.unsplash.com/premium_photo-1682787494977-d013bb5a8773?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                price: 699,
                oldPrice: 899,
                rating: 5,
                reviewCount: 32,
            },
            {
                id: 4, // ✅ MISSING
                title: "Multi-Engine Rating",
                image: "https://plus.unsplash.com/premium_photo-1682787494977-d013bb5a8773?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                price: 549,
                oldPrice: 699,
                rating: 5,
                reviewCount: 15,
            }
        ]
    },
    navigation: {
        menuItems: [
            {
                title: "Shop",
                href: "/shop",
                hasDropdown: false,
                icon: "Store",
            },
            {
                title: "Courses",
                hasDropdown: true,
                icon: "GraduationCap",
                description: "Professional aviation training courses",
                featured: {
                    title: "New Jet Pilot Transition Course",
                    description: "Master the transition to jet aircraft with comprehensive training",
                    image: "https://plus.unsplash.com/premium_photo-1682787494977-d013bb5a8773?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170",
                    href: "/course/new-jet-pilot-transition",
                    badge: "Featured",
                },
                submenus: [
                    {
                        title: "Training Programs",
                        icon: "Rocket",
                        links: [
                            {
                                text: "Pro Line 21 Avionics Training",
                                href: "/course/pro-line-21-avionics",
                                icon: "BookOpenCheck",
                                description: "Master Pro Line 21 avionics systems",
                            },
                            {
                                text: "Pro Line Fusion Avionics Training", // ✅ MISSING
                                href: "/course/pro-line-fusion-avionics",
                                icon: "Trophy",
                                description: "Advanced Pro Line Fusion training",
                            },
                            {
                                text: "New Jet Pilot Transition Course", // ✅ MISSING
                                href: "/course/new-jet-pilot-transition",
                                icon: "Plane",
                                description: "Transition to jet aircraft",
                                badge: "Featured",
                            },
                            {
                                text: "Eclipse Jet Transition Course", // ✅ MISSING
                                href: "/course/eclipse-jet-transition",
                                icon: "Plane",
                                description: "Eclipse jet-specific training",
                            },
                            {
                                text: "All Courses", // ✅ MISSING
                                href: "/course",
                                icon: "BookOpenCheck",
                                description: "Browse all available courses",
                            }
                        ]
                    }
                ]
            },
            {
                title: "About", // ✅ MISSING COMPLETE MENU ITEM
                hasDropdown: true,
                icon: "ShieldCheck",
                description: "Learn more about us",
                submenus: [
                    {
                        title: "Company",
                        icon: "Plane",
                        links: [
                            {
                                text: "About Us",
                                href: "/about-us",
                                icon: "Users",
                                description: "Our story and mission",
                            },
                            {
                                text: "Blog",
                                href: "/blog",
                                icon: "Newspaper",
                                description: "Latest news and updates",
                            },
                            {
                                text: "FAQs",
                                href: "/faqs",
                                icon: "FileText",
                                description: "Frequently asked questions",
                            }
                        ]
                    }
                ]
            },
            {
                title: "Contact", // ✅ MISSING COMPLETE MENU ITEM
                href: "/contact",
                hasDropdown: false,
                icon: "Mail",
            }
        ]
    },
    userMenu: {
        profile: {
            name: "John Doe",
            email: "john.doe@personalwings.com",
            avatar: "/assets/images/team/avatar.jpg",
            avatarFallback: "JD",
            profileLink: "/dashboard/profile",
        },
        isLoggedIn: true,
        menuItems: [
            {
                icon: "Home",
                text: "My Dashboard",
                href: "/dashboard",
                description: "View your overview",
            },
            {
                icon: "ShoppingBag", // ✅ MISSING
                text: "Enrolled Courses",
                href: "/dashboard/enrolled-courses",
                description: "Your enrolled courses",
            },
            {
                icon: "Heart", // ✅ MISSING
                text: "My Wishlist",
                href: "/dashboard/wishlist",
                description: "Favorite courses",
            },
            {
                icon: "ShoppingCart", // ✅ MISSING
                text: "Order History",
                href: "/dashboard/order-history",
                description: "View your orders",
            },
            {
                icon: "Star", // ✅ MISSING
                text: "My Reviews",
                href: "/dashboard/reviews",
                description: "Your course reviews",
            },
            {
                icon: "User", // ✅ MISSING
                text: "My Profile",
                href: "/dashboard/profile",
                description: "Manage your profile",
            }
        ],
        supportLinks: [
            {
                icon: "BookOpen",
                text: "Help & Support",
                href: "/faqs",
            }
        ],
        settingsLinks: [
            {
                icon: "Settings",
                text: "Settings",
                href: "/dashboard/settings",
            },
            {
                icon: "LogOut", // ✅ MISSING
                text: "Logout",
                href: "/api/auth/logout",
            }
        ]
    },
    notifications: {
        enabled: true,
        items: [
            {
                id: 1,
                title: "New Course Available",
                message: "Pro Line 21 Avionics Training is now available",
                type: "course",
                isRead: false,
                time: "2 hours ago",
                link: "/course/pro-line-21-avionics",
                icon: "BookOpenCheck",
            },
            {
                id: 2, // ✅ MISSING
                title: "Course Update",
                message: "Your PPL Course has been updated with new content",
                type: "info",
                isRead: false,
                time: "5 hours ago",
                link: "/dashboard/enrolled-courses",
                icon: "Info",
            },
            {
                id: 3, // ✅ MISSING
                title: "Payment Successful",
                message: "Your payment for Instrument Rating Training was successful",
                type: "success",
                isRead: true,
                time: "1 day ago",
                link: "/dashboard/order-history",
                icon: "CheckCircle",
            },
            {
                id: 4, // ✅ MISSING
                title: "New Message",
                message: "You have a new message from your instructor",
                type: "message",
                isRead: true,
                time: "2 days ago",
                link: "/dashboard/messages",
                icon: "Mail",
            },
            {
                id: 5, // ✅ MISSING
                title: "Certificate Ready",
                message: "Your course completion certificate is ready to download",
                type: "success",
                isRead: true,
                time: "3 days ago",
                link: "/dashboard/certificates",
                icon: "Trophy",
            }
        ],
        viewAllLink: "/dashboard/notifications",
    },
    theme: {
        enabled: true,
        defaultTheme: "light",
    },
    language: { // ✅ MISSING COMPLETE SECTION
        enabled: true,
        defaultLanguage: "en",
        languages: [
            {
                code: "en",
                name: "English",
                flag: "🇺🇸", // Changed from URL to emoji
            },
            {
                code: "es",
                name: "Español",
                flag: "🇪🇸",
            },
            {
                code: "fr",
                name: "Français",
                flag: "🇫🇷",
            },
            {
                code: "de",
                name: "Deutsch",
                flag: "🇩🇪",
            },
            {
                code: "bn",
                name: "বাংলা",
                flag: "🇧🇩",
            }
        ],
    },
    announcement: {
        enabled: true,
        message: "🎉 Limited Time Offer: Get 30% off on all aviation courses! Use code: FLY30",
        link: "/subscription",
        linkText: "Subscribe Now",
        type: "promo",
        dismissible: true,
    },
    cta: {
        text: "Login",
        href: "/sign-in",
        variant: "default",
    },
    topBar: {
        enabled: true,
        backgroundColor: "bg-primary2",
        textColor: "text-white",
        socialStats: {
            enabled: true,
            items: [
                {
                    platform: "phone",
                    count: "+1 (555) 123-4567",
                    label: "Call Us",
                    href: "tel:+15551234567",
                },
                {
                    platform: "email",
                    count: "info@personalwings.com",
                    label: "Email Us",
                    href: "mailto:info@personalwings.com",
                },
                {
                    platform: "location",
                    count: "123 Aviation Blvd, FL",
                    label: "Location",
                    href: "https://maps.google.com",
                },
            ],
        },
        news: {
            enabled: true,
            badge: "Hot",
            text: "Intro price. Get Personal Wings for Big Sale -95% off.",
            icon: "/icons/hand.svg",
            link: "/subscription",
        },
        socialLinks: {
            enabled: true,
            items: [
                { platform: "facebook", href: "https://facebook.com/personalwings" },
                { platform: "tiktok", href: "https://tiktok.com/@personalwings" },
                { platform: "linkedin", href: "https://linkedin.com/company/personalwings" },
                { platform: "instagram", href: "https://instagram.com/personalwings" },
            ],
        },
        language: {
            enabled: true,
            defaultLanguage: "en",
            languages: [
                {
                    code: "en",
                    name: "English",
                    flag: "https://cdn-icons-png.flaticon.com/512/197/197484.png",
                },
                {
                    code: "es",
                    name: "Español",
                    flag: "https://cdn-icons-png.flaticon.com/512/197/197593.png",
                },
                {
                    code: "fr", // ✅ MISSING
                    name: "Français",
                    flag: "https://cdn-icons-png.flaticon.com/512/197/197560.png",
                },
                {
                    code: "de", // ✅ MISSING
                    name: "Deutsch",
                    flag: "https://cdn-icons-png.flaticon.com/512/197/197571.png",
                },
                {
                    code: "bn", // ✅ MISSING
                    name: "বাংলা",
                    flag: "https://cdn-icons-png.flaticon.com/512/197/197582.png",
                }
            ],
        },
        currency: {
            enabled: true,
            defaultCurrency: "USD",
            currencies: [
                { code: "USD", name: "US Dollar" },
                { code: "EUR", name: "Euro" },
                { code: "GBP", name: "British Pound" },
                { code: "JPY", name: "Japanese Yen" }, // ✅ MISSING
                { code: "BDT", name: "Bangladeshi Taka" } // ✅ MISSING
            ],
        },
        mobile: {
            expandable: true,
            showSocialStats: true,
            showSocialLinks: true,
        },
    },
    seo: {
        metaTitle: "Personal Wings - Premium Aviation Training & Flight School",
        metaDescription: "Join Personal Wings for professional pilot training courses including PPL, CPL, Instrument Rating, and Multi-Engine certification. Expert instructors, modern aircraft, and flexible schedules.",
        keywords: [
            "aviation training",
            "flight school",
            "pilot license",
            "PPL course",
            "instrument rating",
            "commercial pilot",
            "flight training",
            "aviation courses",
            "pilot certification",
            "aircraft training"
        ],
        ogImage: "https://personalwings.com/og-image.jpg",
        ogType: "website",
        twitterCard: "summary_large_image",
        canonicalUrl: "https://personalwings.com",
        structuredData: {
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "Personal Wings",
            "description": "Professional aviation training and flight school",
            "url": "https://personalwings.com",
            "logo": "https://personalwings.com/logo.svg",
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+1-555-123-4567",
                "contactType": "Customer Service",
                "email": "info@personalwings.com",
                "availableLanguage": ["English", "Spanish", "French", "German", "Bengali"]
            },
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "123 Aviation Blvd",
                "addressLocality": "Florida",
                "addressCountry": "US"
            },
            "sameAs": [
                "https://facebook.com/personalwings",
                "https://instagram.com/personalwings",
                "https://linkedin.com/company/personalwings",
                "https://tiktok.com/@personalwings"
            ]
        }
    }
};