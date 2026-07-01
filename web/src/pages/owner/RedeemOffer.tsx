import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckIcon } from "../../components/icons";
import { ownerApi } from "../../lib/api";

interface Lookup {
  code: string; status: string; customerName: string; customerPhone: string; createdAt: string;
  offer: { title: string; badge: string; type: string; terms: string; business: { name: string } };
}

export function RedeemOffer() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [r, setR] = useState<Lookup | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function lookup(c: string) {
    if (!c.trim()) return;
    setErr(""); setR(null); setDone(false);
    try {
      const res = await ownerApi.get<Lookup>(`/api/owner/offer-lookup?code=${encodeURIComponent(c.trim())}`);
      setR(res);
    } catch (e) { setErr(e instanceof Error ? e.message : "Not found."); }
  }
  useEffect(() => { const c = params.get("code"); if (c) lookup(c); /* eslint-disable-next-line */ }, []);

  async function redeem(e: FormEvent) {
    e.preventDefault();
    if (!r || busy) return;
    setBusy(true); setErr("");
    try {
      await ownerApi.post("/api/owner/offer-redeem", { code: r.code });
      setDone(true);
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Couldn't redeem."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link to="/owner" className="text-sm font-semibold text-muted hover:text-ink">← Dashboard</Link>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-ink">Redeem offer</h1>
      <p className="mt-1 text-muted">Scan the customer's QR or enter their claim code.</p>

      <form onSubmit={(e) => { e.preventDefault(); lookup(code); }} className="mt-5 flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AV-OF-XXXX-XXXX" className="input font-mono" />
        <button className="btn btn-primary px-5">Find</button>
      </form>
      {err && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{err}</p>}

      {r && !done && (
        <form onSubmit={redeem} className="mt-5 card p-5">
          <span className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-sm font-extrabold text-white">{r.offer.badge}</span>
          <p className="mt-2 font-display text-lg font-bold text-ink">{r.offer.title}</p>
          <p className="text-sm text-muted">{r.offer.business.name}</p>
          <p className="mt-2 text-sm text-ink">Claimed by <span className="font-semibold">{r.customerName || "—"}</span>{r.customerPhone ? ` · ${r.customerPhone}` : ""}</p>
          {r.offer.terms && <p className="mt-2 rounded-xl surface-2 p-3 text-xs text-muted">{r.offer.terms}</p>}
          <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${r.status === "CLAIMED" ? "bg-emerald-500/15 text-emerald-600" : "bg-surface-2 text-muted"}`}>{r.status}</span>
          <button disabled={busy || r.status !== "CLAIMED"} className="btn btn-primary mt-4 w-full py-2.5 disabled:opacity-50">{busy ? "Redeeming…" : r.status === "REDEEMED" ? "Already redeemed" : "Mark redeemed"}</button>
        </form>
      )}

      {done && (
        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
          <p className="mt-3 font-display text-lg font-bold text-ink">Offer redeemed ✓</p>
          <button onClick={() => { setR(null); setDone(false); setCode(""); }} className="btn btn-ghost mt-4 px-4 py-2 text-sm">Redeem another</button>
        </div>
      )}
    </div>
  );
}
