import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BusinessCard } from "../components/BusinessCard";
import { HeartIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "../lib/api";
import type { Business } from "../types";

export function Saved() {
  const { user, loading, openAuth, favoriteIds } = useUserAuth();
  const [items, setItems] = useState<Business[] | null>(null);

  useEffect(() => {
    if (user) userApi.get<Business[]>("/api/me/favorites").then(setItems).catch(() => setItems([]));
  }, [user, favoriteIds.size]);

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-muted">Loading…</div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand-dark"><HeartIcon filled className="h-8 w-8" /></span>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-ink">Save your favourite places</h1>
        <p className="mt-2 text-muted">Log in to keep a list of the businesses you love in Aley.</p>
        <button onClick={openAuth} className="btn btn-primary mt-6 px-6 py-3">Log in or sign up</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Saved places</h1>
      <p className="mt-1 text-muted">{items?.length ?? 0} {items?.length === 1 ? "place" : "places"} you've saved.</p>

      {items && items.length > 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((b) => <BusinessCard key={b.id} business={b} />)}
        </div>
      ) : (
        <div className="card mt-6 p-16 text-center">
          <p className="text-lg font-semibold text-ink">Nothing saved yet.</p>
          <p className="mt-1 text-muted">Tap the heart on any business to save it here.</p>
          <Link to="/explore" className="btn btn-primary mt-4 px-6 py-2.5">Explore Aley</Link>
        </div>
      )}
    </div>
  );
}
