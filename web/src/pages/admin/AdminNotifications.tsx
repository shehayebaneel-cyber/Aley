import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../lib/api";
import type { AdminNotification } from "../../types";

const KIND_ICON: Record<string, string> = {
  BUSINESS_SUBMITTED: "🏪",
  BUSINESS_CLAIM: "🤝",
  RESERVATION: "📅",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminNotifications() {
  const [items, setItems] = useState<AdminNotification[]>([]);

  const load = () => adminApi.get<{ items: AdminNotification[]; unread: number }>("/api/admin/notifications").then((d) => setItems(d.items));
  useEffect(() => { load(); }, []);

  const markAll = async () => { await adminApi.post("/api/admin/notifications/read-all", {}); load(); };
  const markOne = async (id: number) => { await adminApi.post(`/api/admin/notifications/${id}/read`, {}); load(); };

  const unread = items.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Notifications</h1>
          <p className="mt-1 text-muted">{unread > 0 ? `${unread} unread` : "You're all caught up."}</p>
        </div>
        {unread > 0 && <button onClick={markAll} className="btn btn-ghost px-4 py-2 text-sm">Mark all read</button>}
      </div>

      <div className="mt-5 space-y-2">
        {items.map((n) => (
          <div key={n.id} className={`card flex items-start gap-3 p-4 ${!n.isRead ? "!border-brand/40 bg-brand-soft/40" : ""}`}>
            <span className="text-2xl">{KIND_ICON[n.kind] ?? "🔔"}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{n.title}</p>
              {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="text-muted">{timeAgo(n.createdAt)}</span>
                {n.link && <Link to={n.link} onClick={() => markOne(n.id)} className="font-semibold text-brand hover:underline">Open →</Link>}
                {!n.isRead && <button onClick={() => markOne(n.id)} className="font-semibold text-muted hover:text-ink">Mark read</button>}
              </div>
            </div>
            {!n.isRead && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />}
          </div>
        ))}
        {items.length === 0 && <div className="card p-12 text-center text-muted">No notifications yet.</div>}
      </div>
    </div>
  );
}
