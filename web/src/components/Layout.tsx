import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useContent } from "../context/ContentContext";
import { useTheme } from "../context/ThemeContext";
import { useUserAuth } from "../context/UserAuthContext";
import { CartIcon, CloseIcon, HeartIcon, InstagramIcon, LogoutIcon, MapPinIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon, UserIcon } from "./icons";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/explore", label: "Explore" },
  { to: "/events", label: "Events" },
  { to: "/offers", label: "Offers" },
  { to: "/projects", label: "Community" },
  { to: "/map", label: "Map" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

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
      <button onClick={openAuth} className="btn btn-primary px-4 py-2 text-sm"><UserIcon className="h-4 w-4" /> <span className="hidden sm:inline">Log in</span></button>
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
            <HeartIcon className="h-4 w-4 text-rose-500" /> Saved places
          </button>
          <button onClick={() => { setOpen(false); navigate("/orders"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <CartIcon className="h-4 w-4 text-brand" /> My orders
          </button>
          <button onClick={() => { logout(); setOpen(false); navigate("/"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink hover:surface-2">
            <LogoutIcon className="h-4 w-4" /> Log out
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

export function Layout() {
  const { theme, toggle } = useTheme();
  const { brand, contact } = useContent();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  function search(e: FormEvent) {
    e.preventDefault();
    navigate(`/explore?q=${encodeURIComponent(q.trim())}`);
    setMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Logo />
          <span className="hidden items-center gap-1 rounded-full surface-2 px-3 py-1 text-xs font-semibold text-muted sm:inline-flex">
            <MapPinIcon className="h-3.5 w-3.5 text-brand" /> Aley
          </span>

          {/* Desktop search */}
          <form onSubmit={search} className="relative ml-auto hidden max-w-sm flex-1 lg:block">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search businesses, food, services…"
              className="input !pl-9"
            />
          </form>

          <nav className="ml-auto hidden items-center gap-1 lg:ml-4 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-full px-3 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-brand-soft text-brand-dark" : "text-muted hover:text-ink"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <button onClick={toggle} aria-label="Toggle theme" className="btn btn-ghost h-10 w-10 !p-0">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <CartButton />
          <AccountMenu />
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" className="btn btn-ghost h-10 w-10 !p-0 lg:hidden">
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="border-t border-border bg-surface px-4 py-4 lg:hidden">
            <form onSubmit={search} className="relative mb-3">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="input !pl-9" />
            </form>
            <div className="grid grid-cols-2 gap-2">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? "bg-brand text-white" : "surface-2 text-ink"}`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">{brand.footerText}</p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {NAV.slice(1, 6).map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="hover:text-brand">{n.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">For businesses</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li><Link to="/owner/login" className="hover:text-brand">List your business</Link></li>
              <li><Link to="/owner/login" className="font-semibold text-brand hover:text-brand-dark">Business login →</Link></li>
              <li><Link to="/about" className="hover:text-brand">About the platform</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">Coming soon</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>More cities: Beirut · Byblos · Batroun</li>
              <li>Jobs & classifieds</li>
              <li>Loyalty & rewards</li>
            </ul>
            {contact.instagram && (
              <a href={`https://instagram.com/${contact.instagram}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-muted hover:text-brand">
                <InstagramIcon className="h-5 w-5" /> @{contact.instagram}
              </a>
            )}
          </div>
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted">
          © {new Date().getFullYear()} {brand.name} · Built for the city, growing across Lebanon.
        </div>
      </footer>
    </div>
  );
}
