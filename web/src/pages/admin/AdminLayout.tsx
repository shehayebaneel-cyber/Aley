import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BellIcon, GlobeIcon, MoonIcon, SunIcon } from "../../components/icons";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useLang } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { adminApi } from "../../lib/api";

const LINKS = [
  { to: "/admin", tk: "anav.dashboard", end: true },
  { to: "/admin/ai", tk: "anav.ai" },
  { to: "/admin/analytics", tk: "anav.analytics" },
  { to: "/admin/content", tk: "anav.content" },
  { to: "/admin/orders", tk: "anav.orders" },
  { to: "/admin/delivery", tk: "anav.delivery" },
  { to: "/admin/drivers", tk: "anav.drivers" },
  { to: "/admin/businesses", tk: "anav.businesses" },
  { to: "/admin/import", tk: "anav.import" },
  { to: "/admin/claims", tk: "anav.claims" },
  { to: "/admin/categories", tk: "anav.categories" },
  { to: "/admin/reviews", tk: "anav.reviews" },
  { to: "/admin/lost-found", tk: "anav.lostfound" },
  { to: "/admin/announcements", tk: "anav.notices" },
  { to: "/admin/events-offers", tk: "anav.eventsoffers" },
  { to: "/admin/cities", tk: "anav.cities" },
  { to: "/admin/vouchers", tk: "anav.vouchers" },
  { to: "/admin/payments", tk: "anav.payments" },
  { to: "/admin/marketplace", tk: "anav.marketplace" },
  { to: "/admin/users", tk: "anav.users" },
];

function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  useEffect(() => {
    let alive = true;
    const poll = () => adminApi.get<{ unread: number }>("/api/admin/notifications").then((d) => alive && setUnread(d.unread)).catch(() => {});
    poll();
    const t = setInterval(poll, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [location.pathname]);
  return (
    <Link to="/admin/notifications" aria-label="Notifications" className="btn btn-ghost relative h-9 w-9 !p-0">
      <BellIcon className="h-5 w-5" />
      {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">{unread}</span>}
    </Link>
  );
}

export function AdminLayout() {
  const { isAuthed, logout } = useAdminAuth();
  const { theme, toggle } = useTheme();
  const { t, toggle: toggleLang } = useLang();
  const navigate = useNavigate();

  if (!isAuthed) return <Navigate to="/admin/login" replace />;

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <Link to="/admin" className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">A</span>
          <span className="font-display font-extrabold text-ink">Aley Admin</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? "bg-brand-soft text-brand-dark" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
              {t(l.tk)}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 p-3">
          <button onClick={toggleLang} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted hover:text-ink"><GlobeIcon className="h-4 w-4" /> {t("lang.switch")}</button>
          <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:text-ink"><GlobeIcon className="h-4 w-4" /> {t("dash.viewSite")}</Link>
          <button onClick={() => { logout(); navigate("/admin/login"); }} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted hover:text-ink">{t("dash.signOut")}</button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <span className="font-display font-extrabold text-ink md:hidden">Aley Admin</span>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <button onClick={toggle} aria-label="Theme" className="btn btn-ghost h-9 w-9 !p-0">{theme === "dark" ? <SunIcon /> : <MoonIcon />}</button>
            <button onClick={toggleLang} className="btn btn-ghost px-3 py-2 text-sm">{t("lang.switch")}</button>
            <button onClick={() => { logout(); navigate("/admin/login"); }} className="btn btn-ghost px-3 py-2 text-sm md:hidden">{t("dash.signOut")}</button>
          </div>
        </header>
        {/* Mobile nav */}
        <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 md:hidden">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${isActive ? "bg-brand text-white" : "surface-2 text-ink"}`}>
              {t(l.tk)}
            </NavLink>
          ))}
        </nav>
        <main className="p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
