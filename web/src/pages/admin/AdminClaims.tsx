import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";
import type { BusinessClaim } from "../../types";

const FILTERS = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "ALL", label: "All" },
];

export function AdminClaims() {
  const [claims, setClaims] = useState<BusinessClaim[]>([]);
  const [status, setStatus] = useState("PENDING");

  const load = () => adminApi.get<BusinessClaim[]>(`/api/admin/claims?status=${status}`).then(setClaims);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const decide = async (id: number, action: "approve" | "reject") => {
    await adminApi.post(`/api/admin/claims/${id}/${action}`, {});
    load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Business claims</h1>
      <p className="mt-1 text-muted">Owners requesting an existing listing. Approving assigns the business to that owner.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setStatus(f.key)} className={`chip ${status === f.key ? "chip-active" : ""}`}>{f.label}</button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {claims.map((c) => (
          <div key={c.id} className="card flex flex-wrap items-center gap-4 p-4">
            <img src={c.business?.logo ?? c.business?.cover ?? ""} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover surface-2" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">
                {c.business ? <Link to={`/admin/businesses/${c.business.id}`} className="hover:text-brand">{c.business.name}</Link> : "Business"}
                {c.business?.isClaimed && <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600">Already assigned</span>}
              </p>
              <p className="text-sm text-muted">Claimed by <span className="font-semibold text-ink">{c.owner?.name}</span> · {c.owner?.email}{c.owner?.phone ? ` · ${c.owner.phone}` : ""}</p>
              {c.message && <p className="mt-1 text-sm text-muted">“{c.message}”</p>}
            </div>
            {c.status === "PENDING" ? (
              <div className="flex gap-2">
                <button onClick={() => decide(c.id, "approve")} className="chip !border-emerald-400 bg-emerald-500 text-white hover:!bg-emerald-600">✓ Approve & assign</button>
                <button onClick={() => decide(c.id, "reject")} className="chip !border-red-300 text-red-500 hover:!bg-red-500 hover:text-white">Reject</button>
              </div>
            ) : (
              <span className={`chip ${c.status === "APPROVED" ? "!border-emerald-400 text-emerald-600" : "!border-red-300 text-red-500"}`}>{c.status}</span>
            )}
          </div>
        ))}
        {claims.length === 0 && <div className="card p-12 text-center text-muted">No {status.toLowerCase()} claims.</div>}
      </div>
    </div>
  );
}
