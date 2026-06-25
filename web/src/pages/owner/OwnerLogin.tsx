import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useOwnerAuth } from "../../context/OwnerAuthContext";

export function OwnerLogin() {
  const { login, register } = useOwnerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Carry a "claim this business" deep-link through login into the dashboard.
  const claimId = params.get("claim");
  const claimName = params.get("claimName") ?? "";
  const afterAuth = claimId ? `/owner?claim=${encodeURIComponent(claimId)}&claimName=${encodeURIComponent(claimName)}` : "/owner";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form);
      navigate(afterAuth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand/15 via-bg to-accent/10 px-4">
      <div className="card w-full max-w-md p-7">
        <Link to="/" className="flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-black text-white">A</span>
          <span className="font-display text-xl font-extrabold text-ink">Aley <span className="text-brand">for Business</span></span>
        </Link>
        <h1 className="mt-5 text-center font-display text-2xl font-extrabold text-ink">
          {mode === "login" ? "Welcome back" : "Create your business account"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted">
          {mode === "login" ? "Manage your business on Aley." : "List and manage your business on Aley."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "register" && (
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="input" />
          )}
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="input" autoComplete="email" />
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {mode === "register" && (
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className="input" />
          )}
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? "New here? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-semibold text-brand">
            {mode === "login" ? "Create a business account" : "Log in"}
          </button>
        </p>
        <p className="mt-2 text-center text-xs text-muted">Demo: owner@aley.com / owner</p>
      </div>
    </div>
  );
}
