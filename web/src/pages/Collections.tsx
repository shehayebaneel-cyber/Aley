import { CollectionCard } from "../components/CollectionCard";
import { useCity, cityQuery } from "../context/CityContext";
import { useFetch } from "../lib/useFetch";
import { useTitle } from "../lib/useTitle";
import type { CollectionCard as CollectionCardT } from "../types";

export function Collections() {
  useTitle("Discover");
  const { city } = useCity();
  const { data, loading } = useFetch<CollectionCardT[]>(`/api/collections${cityQuery(city)}`);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">Discover ✨</h1>
      <p className="mt-1 text-muted">Curated collections to explore Lebanon — find new places and save ideas for your next trip.</p>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-44 animate-pulse" />)}</div>
      ) : data && data.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map((c) => <CollectionCard key={c.id} c={c} />)}</div>
      ) : (
        <div className="card mt-6 p-16 text-center text-muted">No collections yet — check back soon.</div>
      )}
    </div>
  );
}
