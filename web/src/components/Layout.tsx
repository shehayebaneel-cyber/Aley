import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { AiWidget } from "./AiWidget";
import { AutoTranslate } from "./AutoTranslate";
import { useCart } from "../context/CartContext";
import { useContent } from "../context/ContentContext";
import { useCity } from "../context/CityContext";
import { useLang } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { useUserAuth } from "../context/UserAuthContext";
import { BellIcon, CalendarIcon, CartIcon, CloseIcon, GlobeIcon, HeartIcon, InstagramIcon, LogoutIcon, MapPinIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon, UserIcon } from "./icons";
import { COMMUNITY_URL } from "../lib/config";

type NavItem = { to: string; key: string; end?: boolean };
// Center navigation — the primary destinations.
const NAV: NavItem[] = [
  { to: "/", key: "home", end: true },
  { to: "/explore", key: "explore" },
  { to: "/events", key: "events" },
  { to: "/offers", key: "offers" },
  { to: "/delivery", key: "delivery" },
  { to: "/community", key: "community" },
  { to: "/map", key: "map" },
];

// Renders a nav destination. The "community" item points to the dedicated
// non-profit platform (external) once COMMUNITY_URL is set; until then it links
// to the built-in /community placeholder. Flip the link by editing lib/config.ts.
function NavEntry({ n, className, onClick }: { n: NavItem; className: string | ((p: { isActive: boolean }) => string); onClick?: () => void }) {
  const { t } = useLang();
  const label = t(`nav.${n.key}`);
  if (n.key === "community" && COMMUNITY_URL) {
    const cls = typeof className === "function" ? className({ isActive: false }) : className;
    return <a href={COMMUNITY_URL} target="_blank" rel="noreferrer" className={cls} onClick={onClick}>{label}</a>;
  }
  return <NavLink to={n.to} end={n.end} onClick={onClick} className={className}>{label}</NavLink>;
}
// Secondary links — kept out of the top bar, shown in the mobile menu + footer.
const SECONDARY: NavItem[] = [
  { to: "/about", key: "about" },
  { to: "/contact", key: "contact" },
];

function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button onClick={toggle} aria-label="Switch language" title={lang === "en" ? "العربية" : "English"} className="btn btn-ghost h-10 shrink-0 gap-1 px-2.5 text-sm font-bold">
      <GlobeIcon className="h-4 w-4" /> {lang === "en" ? "ع" : "EN"}
    </button>
  );
}

function Logo() {
  const { brand } = useContent();
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-black text-white shadow-md">{brand.name.charAt(0) || "A"}</span>
      <span className="font-display text-xl font-extrabold tracking-tight text-ink">
        {brand.name}<span className="text-brand">.</span>
      </span>
    </Link>
  );
}

function AccountMenu() {
  const { user, logout, openAuth } = useUserAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) {
    return (
      <button onClick={openAuth} className="btn btn-primary px-4 py-2 text-sm"><UserIcon className="h-4 w-4" /> <span className="hidden sm:inline">{t("common.login")}</span></button>
    );
  }
  const initial = user.name?.charAt(0).toUpperCase() ?? "U";
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex h-10 w-10 items-center justify-center rounded-full bg-brand font-bold text-white" aria-label="Account">
        {initial}
      </button>
      {open && (
        <div className="menu-in absolute right-0 mt-2 w-52 rounded-2xl border border-border bg-surface p-2 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <button onClick={() => { setOpen(false); navigate("/saved"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <HeartIcon className="h-4 w-4 text-rose-500" /> {t("common.saved")}
          </button>
          <button onClick={() => { setOpen(false); navigate("/orders"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <CartIcon className="h-4 w-4 text-brand" /> {t("common.myOrders")}
          </button>
          <button onClick={() => { setOpen(false); navigate("/bookings"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <CalendarIcon className="h-4 w-4 text-brand" /> {t("common.myBookings")}
          </button>
          <button onClick={() => { setOpen(false); navigate("/my-events"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <span className="text-base leading-none">🎟️</span> {t("common.myEvents")}
          </button>
          <button onClick={() => { setOpen(false); navigate("/my-requests"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <span className="text-base leading-none">🔧</span> {t("common.myRequests")}
          </button>
          <button onClick={() => { setOpen(false); navigate("/my-offers"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <span className="text-base leading-none">🏷️</span> {t("common.myOffers")}
          </button>
          <button onClick={() => { setOpen(false); navigate("/gift-vouchers"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <span className="text-base leading-none">🎁</span> {t("common.myVouchers")}
          </button>
          <button onClick={() => { setOpen(false); navigate("/wallet"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <span className="text-base leading-none">💰</span> {t("common.myWallet")}
          </button>
          <button onClick={() => { logout(); setOpen(false); navigate("/"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <LogoutIcon className="h-4 w-4" /> {t("common.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

function CartButton() {
  const { count } = useCart();
  return (
    <Link to="/cart" aria-label="Cart" className="btn btn-ghost relative h-10 w-10 !p-0">
      <CartIcon />
      {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-white">{count}</span>}
    </Link>
  );
}

function CitySelector() {
  const { city, setCity, cities, cityName } = useCity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 rounded-full surface-2 px-3 py-1.5 text-xs font-semibold text-ink" aria-label="Filter by city">
        <MapPinIcon className="h-3.5 w-3.5 text-brand" /> <span className="max-w-[7rem] truncate">{cityName}</span> <span className="text-muted">▾</span>
      </button>
      {open && (
        <div className="menu-in absolute left-0 z-50 mt-2 max-h-80 w-52 overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-xl">
          <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted">Filter by city</p>
          <button onClick={() => { setCity(""); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${!city ? "bg-brand-soft text-brand-dark" : "text-ink hover:surface-2"}`}>🇱🇧 All Lebanon</button>
          {cities.map((c) => (
            <button key={c.slug} onClick={() => { setCity(c.slug); setOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${city === c.slug ? "bg-brand-soft text-brand-dark" : "text-ink hover:surface-2"}`}>📍 {c.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { theme, toggle } = useTheme();
  const { brand, contact } = useContent();
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3">
          {/* Left: logo + city filter */}
          <Logo />
          <CitySelector />

          {/* Center: primary navigation */}
          <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <NavEntry
                key={n.to}
                n={n}
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-brand-soft text-brand-dark" : "text-muted hover:text-ink"
                  }`
                }
              />
            ))}
          </nav>

          {/* Right: actions */}
          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <LangToggle />
            <button onClick={toggle} aria-label="Toggle theme" className="btn btn-ghost h-10 w-10 !p-0">
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <button aria-label="Notifications" title="Notifications — coming soon" className="btn btn-ghost hidden h-10 w-10 cursor-default !p-0 opacity-50 sm:inline-flex">
              <BellIcon className="h-5 w-5" />
            </button>
            <Link to="/ai" aria-label={t("ai.title")} title={t("ai.title")} className="btn btn-ghost hidden h-10 w-10 !p-0 text-lg sm:inline-flex">✨</Link>
            <CartButton />
            <AccountMenu />
            <Link to="/explore" aria-label={t("common.search")} title={t("common.search")} className="btn btn-ghost hidden h-10 w-10 !p-0 sm:inline-flex">
              <SearchIcon className="h-5 w-5" />
            </Link>
            <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" className="btn btn-ghost h-10 w-10 !p-0 lg:hidden">
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="border-t border-border bg-surface px-4 py-4 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {[...NAV, ...SECONDARY].map((n) => (
                <NavEntry
                  key={n.to}
                  n={n}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? "bg-brand text-white" : "surface-2 text-ink"}`
                  }
                />
              ))}
              <Link to="/explore" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl surface-2 px-3 py-2.5 text-sm font-semibold text-ink"><SearchIcon className="h-4 w-4" /> {t("common.search")}</Link>
              <Link to="/ai" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl surface-2 px-3 py-2.5 text-sm font-semibold text-ink">✨ {t("ai.title")}</Link>
            </div>
            <div className="mt-3"><LangToggle /></div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <AutoTranslate />
      <AiWidget />

      <footer className="mt-16 border-t border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">{brand.footerText}</p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">{t("footer.explore")}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {[...NAV.slice(1), ...SECONDARY].map((n) => (
                <li key={n.to}>
                  <NavEntry n={n} className="hover:text-brand" />
                </li>
              ))}
              <li><Link to="/lost-found" className="hover:text-brand">{t("footer.lostFound")}</Link></li>
              <li><Link to="/notices" className="hover:text-brand">{t("footer.notices")}</Link></li>
              <li><Link to="/ai" className="font-semibold text-brand hover:text-brand-dark">{t("footer.askAi")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">{t("footer.forBusiness")}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link to="/owner/login" className="hover:text-brand">{t("footer.listBusiness")}</Link></li>
              <li><Link to="/owner/login" className="font-semibold text-brand hover:text-brand-dark">{t("footer.businessLogin")}</Link></li>
              <li><Link to="/driver/login" className="font-semibold text-brand hover:text-brand-dark">{t("footer.driveWithUs")}</Link></li>
              <li><Link to="/about" className="hover:text-brand">{t("footer.aboutPlatform")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">{t("footer.comingSoon")}</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>{t("footer.moreCities")}</li>
              <li>{t("footer.jobs")}</li>
              <li>{t("footer.loyalty")}</li>
            </ul>
            {contact.instagram && (
              <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-muted hover:text-brand">
                <InstagramIcon className="h-5 w-5" /> @{contact.instagram}
              </a>
            )}
          </div>
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted">
          © {new Date().getFullYear()} {brand.name} · {t("footer.rights")}
        </div>
      </footer>
    </div>
  );
}
