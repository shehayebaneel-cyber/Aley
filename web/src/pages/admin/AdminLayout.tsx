import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BellIcon, GlobeIcon, MoonIcon, SunIcon } from "../../components/icons";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useTheme } from "../../context/ThemeContext";
import { adminApi } from "../../lib/api";

const LINKS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/ai", label: "AI co-pilot" },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/content", label: "Site Content" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/delivery", label: "Delivery" },
  { to: "/admin/drivers", label: "Drivers" },
  { to: "/admin/businesses", label: "Businesses" },
  { to: "/admin/claims", label: "Claims" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/reviews", label: "Reviews" },
  { to: "/admin/projects", label: "Projects" },
  { to: "/admin/lost-found", label: "Lost & Found" },
  { to: "/admin/announcements", label: "Public Notices" },
  { to: "/admin/events-offers", label: "Events & Offers" },
  { to: "/admin/cities", label: "Cities" },
  { to: "/admin/marketplace", label: "Marketplace" },
  { to: "/admin/users", label: "Users & Owners" },
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
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 p-3">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:text-ink"><GlobeIcon className="h-4 w-4" /> View site</Link>
          <button onClick={() => { logout(); navigate("/admin/login"); }} className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted hover:text-ink">Sign out</button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <span className="font-display font-extrabold text-ink md:hidden">Aley Admin</span>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <button onClick={toggle} aria-label="Theme" className="btn btn-ghost h-9 w-9 !p-0">{theme === "dark" ? <SunIcon /> : <MoonIcon />}</button>
            <button onClick={() => { logout(); navigate("/admin/login"); }} className="btn btn-ghost px-3 py-2 text-sm md:hidden">Sign out</button>
          </div>
        </header>
        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 md:hidden">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${isActive ? "bg-brand text-white" : "surface-2 text-ink"}`}>
              {l.label}
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
