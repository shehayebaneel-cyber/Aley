import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Stars } from "../../components/Stars";
import { CheckIcon, CloseIcon, TrashIcon } from "../../components/icons";
import { timeAgo } from "../../lib/api";
import { adminApi } from "../../lib/api";

interface AdminReview {
  id: number;
  authorName: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
  business: { name: string; slug: string };
}

const FILTERS = ["PENDING", "APPROVED", "REJECTED", ""];
const LABEL: Record<string, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected", "": "All" };

export function AdminReviews() {
  const [status, setStatus] = useState("PENDING");
  const [reviews, setReviews] = useState<AdminReview[]>([]);

  const load = () => {
    const p = status ? `?status=${status}` : "";
    adminApi.get<AdminReview[]>(`/api/admin/reviews${p}`).then(setReviews);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const moderate = async (id: number, s: string) => { await adminApi.patch(`/api/admin/reviews/${id}`, { status: s }); load(); };
  const del = async (id: number) => { if (confirm("Delete this review?")) { await adminApi.delete(`/api/admin/reviews/${id}`); load(); } };

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">Reviews</h1>
      <p className="mt-1 text-muted">Approve or reject submitted reviews. Approved reviews update the business rating.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => <button key={f} onClick={() => setStatus(f)} className={`chip ${status === f ? "chip-active" : ""}`}>{LABEL[f]}</button>)}
      </div>

      <div className="mt-5 space-y-3">
        {reviews.length === 0 && <div className="card p-10 text-center text-muted">No {LABEL[status].toLowerCase()} reviews.</div>}
        {reviews.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{r.authorName} <span className="text-muted">on</span> <Link to={`/business/${r.business.slug}`} className="text-brand">{r.business.name}</Link></p>
                <Stars rating={r.rating} className="mt-0.5 h-4 w-4" />
              </div>
              <span className="text-xs text-muted">{timeAgo(r.createdAt)} · {LABEL[r.status]}</span>
            </div>
            {r.comment && <p className="mt-2 text-sm text-muted">{r.comment}</p>}
            <div className="mt-3 flex gap-2">
              {r.status !== "APPROVED" && <button onClick={() => moderate(r.id, "APPROVED")} className="btn bg-emerald-500 px-4 py-2 text-sm text-white"><CheckIcon className="h-4 w-4" /> Approve</button>}
              {r.status !== "REJECTED" && <button onClick={() => moderate(r.id, "REJECTED")} className="btn btn-ghost px-4 py-2 text-sm"><CloseIcon className="h-4 w-4" /> Reject</button>}
              <button onClick={() => del(r.id)} className="btn btn-ghost px-4 py-2 text-sm text-red-500"><TrashIcon className="h-4 w-4" /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
