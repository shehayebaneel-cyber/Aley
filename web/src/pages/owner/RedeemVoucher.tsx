import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckIcon } from "../../components/icons";
import { ownerApi } from "../../lib/api";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
interface Lookup { code: string; kind: string; title: string; value: number; balance: number; status: string; business: { name: string } }

export function RedeemVoucher() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [v, setV] = useState<Lookup | null>(null);
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ redeemed: number; remaining: number; status: string } | null>(null);

  async function lookup(c: string) {
    if (!c.trim()) return;
    setErr(""); setV(null); setDone(null);
    try {
      const r = await ownerApi.get<Lookup>(`/api/owner/voucher-lookup?code=${encodeURIComponent(c.trim())}`);
      setV(r); setAmount(r.kind === "FIXED" ? String(r.balance) : "");
    } catch (e) { setErr(e instanceof Error ? e.message : "Not found."); }
  }
  useEffect(() => { const c = params.get("code"); if (c) lookup(c); /* eslint-disable-next-line */ }, []);

  async function redeem(e: FormEvent) {
    e.preventDefault();
    if (!v || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await ownerApi.post<{ redeemed: number; remainingBalance: number; status: string }>("/api/owner/voucher-redeem", { code: v.code, amount: v.kind === "FIXED" ? Number(amount) : undefined });
      setDone({ redeemed: r.redeemed, remaining: r.remainingBalance, status: r.status });
    } catch (e2) { setErr(e2 instanceof Error ? e2.message : "Couldn't redeem."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Link to="/owner" className="text-sm font-semibold text-muted hover:text-ink">← Dashboard</Link>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-ink">Redeem gift voucher</h1>
      <p className="mt-1 text-muted">Scan the customer's QR or enter the voucher code.</p>

      <form onSubmit={(e) => { e.preventDefault(); lookup(code); }} className="mt-5 flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AV-XXXX-XXXX-XXXX" className="input font-mono" />
        <button className="btn btn-primary px-5">Find</button>
      </form>
      {err && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-500">{err}</p>}

      {v && !done && (
        <form onSubmit={redeem} className="mt-5 card p-5">
          <p className="font-display text-lg font-bold text-ink">{v.title}</p>
          <p className="text-sm text-muted">{v.business.name}</p>
          {v.kind === "FIXED" ? (
            <>
              <p className="mt-2 text-sm text-ink">Balance: <span className="font-bold">{money(v.balance)}</span></p>
              <label className="mt-3 block text-sm font-semibold text-ink">Amount to redeem
                <input type="number" min={1} max={v.balance} value={amount} onChange={(e) => setAmount(e.target.value)} className="input mt-1" />
              </label>
            </>
          ) : <p className="mt-2 text-sm text-ink">One-time redemption.</p>}
          <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${v.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-500"}`}>{v.status.replace("_", " ")}</span>
          <button disabled={busy || v.status !== "ACTIVE"} className="btn btn-primary mt-4 w-full py-2.5 disabled:opacity-50">{busy ? "Redeeming…" : "Redeem"}</button>
        </form>
      )}

      {done && (
        <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
          <p className="mt-3 font-display text-lg font-bold text-ink">Redeemed {money(done.redeemed)} ✓</p>
          <p className="mt-1 text-sm text-muted">{done.status === "REDEEMED" ? "Voucher fully used." : `Remaining balance: ${money(done.remaining)}`}</p>
          <button onClick={() => { setV(null); setDone(null); setCode(""); }} className="btn btn-ghost mt-4 px-4 py-2 text-sm">Redeem another</button>
        </div>
      )}
    </div>
  );
}
