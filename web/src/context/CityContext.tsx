import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

// Lebanon-wide platform: the selected city is a FILTER, not a required scope.
// Empty = "All Lebanon" (nationwide). Persisted so a chosen city sticks.

export interface CityOption { slug: string; name: string; nameAr?: string }

interface CityValue {
  city: string; // "" = all of Lebanon
  setCity: (slug: string) => void;
  cities: CityOption[];
  cityName: string;
}
const CityContext = createContext<CityValue | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCityState] = useState<string>(() => { try { return localStorage.getItem("aley-city") ?? ""; } catch { return ""; } });
  const [cities, setCities] = useState<CityOption[]>([]);

  useEffect(() => { api.get<CityOption[]>("/api/cities").then(setCities).catch(() => {}); }, []);

  const setCity = (slug: string) => {
    setCityState(slug);
    try { slug ? localStorage.setItem("aley-city", slug) : localStorage.removeItem("aley-city"); } catch { /* ignore */ }
  };

  const value = useMemo<CityValue>(() => ({
    city, setCity, cities,
    cityName: cities.find((c) => c.slug === city)?.name ?? "All Lebanon",
  }), [city, cities]);

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used inside CityProvider");
  return ctx;
}

/** Build a query string with the city filter applied (+ optional extra params). */
export function cityQuery(city: string, extra?: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  if (city) p.set("city", city);
  for (const [k, v] of Object.entries(extra ?? {})) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
