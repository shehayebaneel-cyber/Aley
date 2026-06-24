import { useEffect, useState } from "react";
import { adminApi, timeAgo } from "../../lib/api";

interface AUser { id: number; name: string; email: string | null; createdAt: string; reviews: number; favorites: number }
interface AOwner { id: number; name: string; email: string; phone: string; createdAt: string; businesses: number }

export function AdminUsers() {
  const [tab, setTab] = useState<"users" | "owners">("users");
  const [users, setUsers] = useState<AUser[]>([]);
  const [owners, setOwners] = useState<AOwner[]>([]);

  useEffect(() => {
    adminApi.get<AUser[]>("/api/admin/users").then(setUsers);
    adminApi.get<AOwner[]>("/api/admin/owners").then(setOwners);
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-ink">People</h1>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setTab("users")} className={`chip ${tab === "users" ? "chip-active" : ""}`}>Visitors ({users.length})</button>
        <button onClick={() => setTab("owners")} className={`chip ${tab === "owners" ? "chip-active" : ""}`}>Business owners ({owners.length})</button>
      </div>

      <div className="card mt-5 overflow-hidden">
        {tab === "users" ? (
          <table className="w-full text-sm">
            <thead className="surface-2 text-left text-xs uppercase text-muted">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Reviews</th><th className="px-4 py-3">Saved</th><th className="px-4 py-3">Joined</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}><td className="px-4 py-3 font-semibold text-ink">{u.name}</td><td className="px-4 py-3 text-muted">{u.email}</td><td className="px-4 py-3 text-muted">{u.reviews}</td><td className="px-4 py-3 text-muted">{u.favorites}</td><td className="px-4 py-3 text-muted">{timeAgo(u.createdAt)}</td></tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No visitor accounts yet.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead className="surface-2 text-left text-xs uppercase text-muted">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Businesses</th><th className="px-4 py-3">Joined</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {owners.map((o) => (
                <tr key={o.id}><td className="px-4 py-3 font-semibold text-ink">{o.name}</td><td className="px-4 py-3 text-muted">{o.email}</td><td className="px-4 py-3 text-muted">{o.phone}</td><td className="px-4 py-3 text-muted">{o.businesses}</td><td className="px-4 py-3 text-muted">{timeAgo(o.createdAt)}</td></tr>
              ))}
              {owners.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No business owners yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
