import { FormEvent, useState } from "react";
import { CloseIcon, HeartIcon } from "./icons";

export function AuthModal({
  open,
  onClose,
  onLogin,
  onRegister,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (data: { name: string; email: string; password: string }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (mode === "login") await onLogin(form.email, form.password);
      else await onRegister(form);
      onClose();
      setForm({ name: "", email: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in w-full max-w-md rounded-b-none p-7 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark"><HeartIcon filled /></span>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        <h2 className="mt-4 font-display text-2xl font-extrabold text-ink">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="mt-1 text-sm text-muted">Save your favourite places, write reviews, and follow what's new in Aley.</p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "register" && (
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" className="input" />
          )}
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="input" autoComplete="email" />
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-2 opacity-60">
          <button disabled className="btn btn-ghost cursor-not-allowed py-2.5 text-sm" title="Coming soon">Google</button>
          <button disabled className="btn btn-ghost cursor-not-allowed py-2.5 text-sm" title="Coming soon">Apple</button>
        </div>
        <p className="mt-1 text-center text-[11px] text-muted">Social login coming soon</p>

        <p className="mt-4 text-center text-sm text-muted">
          {mode === "login" ? "New to Aley? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-semibold text-brand">
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
