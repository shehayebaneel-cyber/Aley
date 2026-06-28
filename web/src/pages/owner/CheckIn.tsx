import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckIcon } from "../../components/icons";
import { ownerApi } from "../../lib/api";

interface Result { businessName: string; customerName: string; date: string; time: string }

export function CheckIn() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  async function checkIn(value: string) {
    if (!value.trim()) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const r = await ownerApi.post<{ ok: boolean } & Result>("/api/owner/checkin", { code: value.trim() });
      setResult(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't check in.");
    } finally {
      setBusy(false);
    }
  }

  // Auto check-in when a code arrives via the scanned QR URL.
  useEffect(() => {
    const c = params.get("code");
    if (c) checkIn(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link to="/owner" className="text-sm font-semibold text-muted hover:text-ink">← Dashboard</Link>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-ink">Appointment check-in</h1>
      <p className="mt-1 text-muted">Scan the customer's QR code, or enter their check-in code below.</p>

      <form onSubmit={(e: FormEvent) => { e.preventDefault(); checkIn(code); }} className="mt-5 flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Check-in code (e.g. 4F9A1C)" className="input font-mono" />
        <button disabled={busy} className="btn btn-primary px-5 disabled:opacity-60">{busy ? "…" : "Check in"}</button>
      </form>

      {err && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{err}</p>}
      {result && (
        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
          <p className="mt-3 font-display text-lg font-bold text-ink">{result.customerName} checked in ✓</p>
          <p className="mt-1 text-sm text-muted">{result.businessName} · {result.date} at {result.time}</p>
        </div>
      )}
    </div>
  );
}
