import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDriverAuth } from "../../context/DriverAuthContext";

export function DriverLogin() {
  const { login, register } = useDriverAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", login: "", phone: "", email: "", vehicle: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await login(form.login, form.password);
      else await register({ name: form.name, phone: form.phone, email: form.email || undefined, vehicle: form.vehicle || undefined, password: form.password });
      navigate("/driver");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand/15 via-bg to-sky-400/10 px-4">
      <div className="card w-full max-w-md p-7">
        <Link to="/" className="flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-black text-white">A</span>
          <span className="font-display text-xl font-extrabold text-ink">Aley <span className="text-brand">Drivers</span></span>
        </Link>
        <h1 className="mt-5 text-center font-display text-2xl font-extrabold text-ink">
          {mode === "login" ? "Driver login" : "Become a driver"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted">
          {mode === "login" ? "Log in to pick up and complete deliveries." : "Apply to deliver — admin approves new drivers."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === "register" ? (
            <>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="input" />
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" className="input" />
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" className="input" />
              <input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="Vehicle (e.g. Motorbike)" className="input" />
            </>
          ) : (
            <input required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="Phone or email" className="input" />
          )}
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Apply to drive"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? "Want to drive? " : "Already a driver? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-semibold text-brand">
            {mode === "login" ? "Apply here" : "Log in"}
          </button>
        </p>
        <p className="mt-2 text-center text-xs text-muted">Demo: driver@aley.com / driver</p>
      </div>
    </div>
  );
}
