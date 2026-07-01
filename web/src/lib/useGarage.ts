import { useCallback, useEffect, useState } from "react";
import { useUserAuth } from "../context/UserAuthContext";
import { userApi } from "./api";

export interface Vehicle { id?: number; make: string; model: string; year: string; engine: string; vin: string; plate: string }

const LS_KEY = "aley-garage";
const readLS = (): Vehicle[] => { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } };
const writeLS = (v: Vehicle[]) => { try { localStorage.setItem(LS_KEY, JSON.stringify(v.slice(0, 10))); } catch { /* ignore */ } };

/** A saved-vehicles "garage". Server-backed when logged in, localStorage for guests. */
export function useGarage() {
  const { user } = useUserAuth();
  const [cars, setCars] = useState<Vehicle[]>([]);

  const reload = useCallback(() => {
    if (user) userApi.get<Vehicle[]>("/api/me/vehicles").then(setCars).catch(() => setCars([]));
    else setCars(readLS());
  }, [user]);
  useEffect(() => { reload(); }, [reload]);

  const add = async (v: Vehicle) => {
    if (!v.make) return;
    if (user) { try { const saved = await userApi.post<Vehicle>("/api/me/vehicles", v); setCars((c) => [...c, saved]); } catch { /* ignore */ } }
    else { const next = [...readLS(), v]; writeLS(next); setCars(next); }
  };
  const remove = async (v: Vehicle, i: number) => {
    if (user && v.id) { try { await userApi.delete(`/api/me/vehicles/${v.id}`); } catch { /* ignore */ } setCars((c) => c.filter((x) => x.id !== v.id)); }
    else { const next = readLS().filter((_, j) => j !== i); writeLS(next); setCars(next); }
  };
  return { cars, add, remove, reload };
}
