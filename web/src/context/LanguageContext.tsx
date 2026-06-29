import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "ar";

// UI string dictionary. Keys are dotted; Arabic falls back to English if missing.
// Dynamic data (business names, descriptions, reviews, CMS hero text) is NOT here —
// it stays in whatever language it was entered.
const DICT: Record<Lang, Record<string, string>> = {
  en: {
    "nav.home": "Home", "nav.explore": "Explore", "nav.events": "Events", "nav.offers": "Offers",
    "nav.delivery": "Delivery", "nav.community": "Community", "nav.map": "Map", "nav.about": "About", "nav.contact": "Contact",
    "common.searchPlaceholder": "Search businesses, food, services…", "common.search": "Search", "common.shortSearch": "Search…",
    "common.login": "Log in", "common.logout": "Log out", "common.saved": "Saved places", "common.myOrders": "My orders", "common.myBookings": "My appointments", "common.myVouchers": "My gift vouchers", "common.aley": "Aley", "common.send": "Send",
    "footer.explore": "Explore", "footer.forBusiness": "For businesses", "footer.listBusiness": "List your business",
    "footer.businessLogin": "Business login →", "footer.driveWithUs": "Drive with us →", "footer.aboutPlatform": "About the platform",
    "footer.comingSoon": "Coming soon", "footer.moreCities": "More cities: Beirut · Byblos · Batroun", "footer.jobs": "Jobs & classifieds",
    "footer.loyalty": "Loyalty & rewards", "footer.lostFound": "Lost & Found", "footer.notices": "Public Notices", "footer.askAi": "Ask Aley AI ✨",
    "footer.rights": "Built for the city, growing across Lebanon.",
    "ai.title": "Aley AI", "ai.subtitle": "Find anything in Aley", "ai.fullPage": "Full page ↗", "ai.placeholder": "Ask Aley AI…", "ai.thinking": "Aley AI is thinking…",
    "ai.greeting": "Hi! I'm **Aley AI**. Ask me to find a business, service, event or offer — or to set up a delivery. How can I help?",
    "ai.s1": "Find a quiet coffee shop to study", "ai.s2": "Which mechanic is open now?", "ai.s3": "What's happening in Aley this weekend?", "ai.s4": "Deliver flowers to my house",
    "explore.title": "Explore Aley", "explore.browse": "Browse by category, or search and filter to find anything in Aley.", "explore.loading": "Loading…", "explore.placesFound": "{n} places found", "explore.allCategories": "All categories", "explore.all": "All",
    "filter.openNow": "Open now", "filter.delivery": "Delivery", "filter.reservations": "Reservations", "filter.vouchers": "Gift vouchers", "filter.rating4": "4★ & up",
    "price.any": "Any price", "price.1": "$", "price.2": "$$ & under", "price.3": "$$$ & under",
    "sort.recommended": "Recommended", "sort.topRated": "Top rated", "sort.mostReviewed": "Most reviewed", "sort.newest": "Newest", "sort.az": "A–Z",
    "explore.seeAll": "See all →", "explore.place": "place", "explore.places": "places", "explore.noResults": "No places match your filters.", "explore.noResultsHint": "Try clearing a filter or searching something else.",
    "aiPage.subtitle": "Your guide to everything in Aley — ask in plain language and I'll find businesses, services, events, offers, community projects and more, using live platform data.",
    "aiPage.greeting": "Hi! I'm **Aley AI**. I can find and compare businesses, recommend places, surface offers and events, help with delivery, and answer questions about Aley. What are you looking for?",
    "dash.viewSite": "View site", "dash.site": "Site", "dash.signOut": "Sign out", "dash.logout": "Log out",
    "anav.dashboard": "Dashboard", "anav.ai": "AI co-pilot", "anav.analytics": "Analytics", "anav.content": "Site Content", "anav.orders": "Orders", "anav.delivery": "Delivery", "anav.drivers": "Drivers", "anav.businesses": "Businesses", "anav.claims": "Claims", "anav.categories": "Categories", "anav.reviews": "Reviews", "anav.projects": "Projects", "anav.lostfound": "Lost & Found", "anav.notices": "Public Notices", "anav.eventsoffers": "Events & Offers", "anav.cities": "Cities", "anav.vouchers": "Gift Vouchers", "anav.marketplace": "Marketplace", "anav.users": "Users & Owners",
    "lang.switch": "العربية",
  },
  ar: {
    "nav.home": "الرئيسية", "nav.explore": "استكشف", "nav.events": "الفعاليات", "nav.offers": "العروض",
    "nav.delivery": "التوصيل", "nav.community": "المجتمع", "nav.map": "الخريطة", "nav.about": "عن المنصة", "nav.contact": "تواصل",
    "common.searchPlaceholder": "ابحث عن متاجر، طعام، خدمات…", "common.search": "بحث", "common.shortSearch": "بحث…",
    "common.login": "تسجيل الدخول", "common.logout": "تسجيل الخروج", "common.saved": "الأماكن المحفوظة", "common.myOrders": "طلباتي", "common.myBookings": "مواعيدي", "common.myVouchers": "قسائمي", "common.aley": "عاليه", "common.send": "إرسال",
    "footer.explore": "استكشف", "footer.forBusiness": "للأعمال", "footer.listBusiness": "أضف نشاطك التجاري",
    "footer.businessLogin": "دخول الأعمال ←", "footer.driveWithUs": "انضم كسائق ←", "footer.aboutPlatform": "عن المنصة",
    "footer.comingSoon": "قريبًا", "footer.moreCities": "مدن أخرى: بيروت · جبيل · البترون", "footer.jobs": "وظائف وإعلانات",
    "footer.loyalty": "الولاء والمكافآت", "footer.lostFound": "المفقودات", "footer.notices": "إعلانات رسمية", "footer.askAi": "اسأل مساعد عاليه ✨",
    "footer.rights": "صُنع للمدينة، وينمو في كل لبنان.",
    "ai.title": "مساعد عاليه", "ai.subtitle": "اعثر على أي شيء في عاليه", "ai.fullPage": "الصفحة الكاملة ↗", "ai.placeholder": "اسأل مساعد عاليه…", "ai.thinking": "مساعد عاليه يفكّر…",
    "ai.greeting": "مرحبًا! أنا **مساعد عاليه**. اسألني للعثور على متجر أو خدمة أو فعالية أو عرض — أو لترتيب عملية توصيل. كيف أساعدك؟",
    "ai.s1": "اعثر على مقهى هادئ للدراسة", "ai.s2": "أي ميكانيكي مفتوح الآن؟", "ai.s3": "ما الذي يحدث في عاليه هذا الأسبوع؟", "ai.s4": "وصّل وردًا إلى منزلي",
    "explore.title": "استكشف عاليه", "explore.browse": "تصفّح حسب الفئة، أو ابحث وفلتر للعثور على أي شيء في عاليه.", "explore.loading": "جارٍ التحميل…", "explore.placesFound": "{n} مكان", "explore.allCategories": "كل الفئات", "explore.all": "الكل",
    "filter.openNow": "مفتوح الآن", "filter.delivery": "توصيل", "filter.reservations": "حجوزات", "filter.vouchers": "قسائم هدايا", "filter.rating4": "4★ فأكثر",
    "price.any": "أي سعر", "price.1": "$", "price.2": "$$ وأقل", "price.3": "$$$ وأقل",
    "sort.recommended": "مقترح", "sort.topRated": "الأعلى تقييمًا", "sort.mostReviewed": "الأكثر مراجعةً", "sort.newest": "الأحدث", "sort.az": "أ–ي",
    "explore.seeAll": "عرض الكل ←", "explore.place": "مكان", "explore.places": "أماكن", "explore.noResults": "لا توجد أماكن تطابق الفلاتر.", "explore.noResultsHint": "جرّب إزالة فلتر أو البحث عن شيء آخر.",
    "aiPage.subtitle": "دليلك إلى كل شيء في عاليه — اسأل بلغة بسيطة وسأجد لك المتاجر والخدمات والفعاليات والعروض ومشاريع المجتمع والمزيد، باستخدام بيانات المنصة الحيّة.",
    "aiPage.greeting": "مرحبًا! أنا **مساعد عاليه**. أستطيع البحث عن الأعمال ومقارنتها، واقتراح الأماكن، وإظهار العروض والفعاليات، والمساعدة في التوصيل، والإجابة عن أسئلتك حول عاليه. عمّ تبحث؟",
    "dash.viewSite": "عرض الموقع", "dash.site": "الموقع", "dash.signOut": "تسجيل الخروج", "dash.logout": "تسجيل الخروج",
    "anav.dashboard": "لوحة التحكم", "anav.ai": "مساعد الذكاء", "anav.analytics": "التحليلات", "anav.content": "محتوى الموقع", "anav.orders": "الطلبات", "anav.delivery": "التوصيل", "anav.drivers": "السائقون", "anav.businesses": "الأعمال", "anav.claims": "المطالبات", "anav.categories": "الفئات", "anav.reviews": "المراجعات", "anav.projects": "المشاريع", "anav.lostfound": "المفقودات", "anav.notices": "الإعلانات الرسمية", "anav.eventsoffers": "الفعاليات والعروض", "anav.cities": "المدن", "anav.vouchers": "قسائم الهدايا", "anav.marketplace": "السوق", "anav.users": "المستخدمون والملّاك",
    "lang.switch": "English",
  },
};

interface LangValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LangValue | null>(null);
const KEY = "aley-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem(KEY) as Lang) || "en"; } catch { return "en"; }
  });
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((l) => (l === "en" ? "ar" : "en")), []);
  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let s = DICT[lang][key] ?? DICT.en[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
    return s;
  }, [lang]);

  const value = useMemo<LangValue>(() => ({ lang, dir, setLang, toggle, t }), [lang, dir, setLang, toggle, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
