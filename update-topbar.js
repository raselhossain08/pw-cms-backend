// Quick script to update topBar data
const topBarData = {
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
                code: "fr",
                name: "Français",
                flag: "https://cdn-icons-png.flaticon.com/512/197/197560.png",
            },
            {
                code: "de",
                name: "Deutsch",
                flag: "https://cdn-icons-png.flaticon.com/512/197/197571.png",
            },
            {
                code: "bn",
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
            { code: "JPY", name: "Japanese Yen" },
            { code: "BDT", name: "Bangladeshi Taka" }
        ],
    },
    mobile: {
        expandable: true,
        showSocialStats: true,
        showSocialLinks: true,
    },
};

const API_URL = process.env.API_URL || 'http://localhost:8000';

async function updateTopBar() {
    try {
        const response = await fetch(`${API_URL}/header/active/topbar`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topBar: topBarData }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ TopBar updated successfully!');
        console.log('Updated header:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error updating topBar:', error.message);
    }
}

updateTopBar();
