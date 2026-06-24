import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useOwnerAuth } from "../../context/OwnerAuthContext";
import { GlobeIcon, MoonIcon, SunIcon } from "../../components/icons";

export function OwnerLayout() {
  const { owner, loading, logout } = useOwnerAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted">Loading…</div>;
  if (!owner) return <Navigate to="/owner/login" replace />;

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/owner" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-black text-white">A</span>
            <span className="font-display font-extrabold text-ink">Aley <span className="text-brand">for Business</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="btn btn-ghost hidden px-3 py-2 text-sm sm:inline-flex"><GlobeIcon className="h-4 w-4" /> View site</Link>
            <button onClick={toggle} aria-label="Theme" className="btn btn-ghost h-9 w-9 !p-0">{theme === "dark" ? <SunIcon /> : <MoonIcon />}</button>
            <span className="hidden text-sm font-semibold text-ink sm:inline">{owner.name}</span>
            <button onClick={() => { logout(); navigate("/owner/login"); }} className="btn btn-ghost px-4 py-2 text-sm">Log out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
