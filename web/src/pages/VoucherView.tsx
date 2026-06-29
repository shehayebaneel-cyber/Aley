import { Link, useParams } from "react-router-dom";
import { QRCode, redeemUrl } from "../components/QRCode";
import { useFetch } from "../lib/useFetch";
import { useTitle } from "../lib/useTitle";

const money = (n: number) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const STATUS: Record<string, string> = { ACTIVE: "bg-emerald-500/15 text-emerald-600", PENDING_DELIVERY: "bg-amber-400/15 text-amber-600", REDEEMED: "bg-surface-2 text-muted", EXPIRED: "bg-red-500/15 text-red-500", DISABLED: "bg-red-500/15 text-red-500" };

interface V {
  code: string; kind: string; title: string; value: number; balance: number; status: string; expiresAt: string | null;
  recipientName: string; message: string; terms: string; business: { name: string; slug: string; logo: string | null };
}

export function VoucherView() {
  const { code } = useParams();
  const { data: v, loading, error } = useFetch<V>(code ? `/api/vouchers/view/${code}` : null);
  useTitle("Gift voucher");

  if (loading) return <div className="mx-auto max-w-md px-4 py-20"><div className="card h-80 animate-pulse" /></div>;
  if (error || !v) return <div className="mx-auto max-w-md px-4 py-24 text-center"><p className="text-lg font-semibold text-ink">Voucher not found.</p><Link to="/" className="mt-3 inline-block font-semibold text-brand">← Home</Link></div>;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="card overflow-hidden p-0">
        <div className="bg-gradient-to-br from-brand to-brand-dark p-6 text-center text-white">
          {v.business.logo && <img src={v.business.logo} alt="" className="mx-auto h-14 w-14 rounded-xl object-cover" />}
          <p className="mt-2 text-sm opacity-90">Gift voucher for</p>
          <Link to={`/business/${v.business.slug}`} className="font-display text-xl font-extrabold">{v.business.name}</Link>
        </div>
        <div className="p-6 text-center">
          <p className="font-display text-lg font-bold text-ink">{v.title}</p>
          {v.kind === "FIXED" ? (
            <p className="mt-1 font-display text-4xl font-extrabold text-brand">{money(v.balance)}<span className="text-base font-semibold text-muted"> left</span></p>
          ) : (
            <p className="mt-1 font-display text-2xl font-extrabold text-brand">{v.title}</p>
          )}
          <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${STATUS[v.status] ?? "bg-surface-2 text-muted"}`}>{v.status.replace("_", " ")}</span>

          {v.message && <p className="mt-4 rounded-xl surface-2 p-3 text-sm italic text-ink">“{v.message}”{v.recipientName ? ` — for ${v.recipientName}` : ""}</p>}

          <div className="mt-5 flex flex-col items-center">
            <QRCode value={redeemUrl(v.code)} size={170} />
            <p className="mt-2 text-xs text-muted">Show this at {v.business.name} to redeem</p>
            <p className="font-mono text-lg font-bold text-ink">{v.code}</p>
          </div>

          {v.expiresAt && <p className="mt-3 text-xs text-muted">Valid until {new Date(v.expiresAt).toLocaleDateString()}</p>}
          {v.terms && <p className="mt-3 text-left text-xs text-muted"><span className="font-semibold text-ink">Terms: </span>{v.terms}</p>}
        </div>
      </div>
    </div>
  );
}
