import { useEffect, useState } from "react";
import { CheckIcon } from "../../components/icons";
import { adminApi } from "../../lib/api";

interface Settings { deliveryFee: number; freeDeliveryThreshold: number; commissionRate: number }

export function AdminMarketplace() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { adminApi.get<Settings>("/api/admin/marketplace").then(setS); }, []);
  if (!s) return <div className="card h-48 animate-pulse" />;

  const set = (p: Partial<Settings>) => setS({ ...s, ...p });
  const save = async () => { setBusy(true); setSaved(false); try { setS(await adminApi.put<Settings>("/api/admin/marketplace", s)); setSaved(true); } finally { setBusy(false); } };

  const field = "mt-1 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm";

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-extrabold text-ink">Marketplace settings</h1>
      <p className="mt-1 text-muted">Control delivery fees and platform commission for orders.</p>

      <section className="card mt-6 space-y-4 p-5">
        <label className="block text-sm font-semibold text-ink">
          Delivery fee ($)
          <input type="number" min={0} step="0.5" value={s.deliveryFee} onChange={(e) => set({ deliveryFee: Number(e.target.value) })} className={field} />
          <span className="mt-1 block text-xs font-normal text-muted">Flat fee added to delivery orders (one combined fee per order).</span>
        </label>
        <label className="block text-sm font-semibold text-ink">
          Free delivery over ($) <span className="font-normal text-muted">— 0 to disable</span>
          <input type="number" min={0} step="1" value={s.freeDeliveryThreshold} onChange={(e) => set({ freeDeliveryThreshold: Number(e.target.value) })} className={field} />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Default commission (%)
          <input type="number" min={0} max={100} step="0.5" value={s.commissionRate} onChange={(e) => set({ commissionRate: Number(e.target.value) })} className={field} />
          <span className="mt-1 block text-xs font-normal text-muted">Charged to each business per order. Override it per business in the business editor (set a business's rate to 0 to use this default).</span>
        </label>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={busy} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{busy ? "Saving…" : "Save settings"}</button>
          {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckIcon className="h-4 w-4" /> Saved</span>}
        </div>
      </section>

      <div className="card mt-4 surface-2 p-4 text-sm text-muted">
        <p className="font-semibold text-ink">How it works</p>
        <p className="mt-1">Pickup orders have no delivery fee. Delivery orders use the flat fee above (free over the threshold). Commission is calculated per business on each order and shown in the admin order view.</p>
      </div>
    </div>
  );
}
