export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---- Auth tokens (owner / visitor / admin) ----
const tokenStore = (key: string) => ({
  get: () => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) localStorage.setItem(key, t);
      else localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
});

const ownerStore = tokenStore("aley-owner-token");
const userStore = tokenStore("aley-user-token");
const adminStore = tokenStore("aley-admin-token");

export const getOwnerToken = ownerStore.get;
export const setOwnerToken = ownerStore.set;
export const getUserToken = userStore.get;
export const setUserToken = userStore.set;
export const getAdminToken = adminStore.get;
export const setAdminToken = adminStore.set;

function makeRequest(tokenGetter?: () => string | null) {
  return async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = tokenGetter?.();
    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      let message = "Something went wrong.";
      try {
        message = (await res.json()).error ?? message;
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, message);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  };
}

function makeApi(tokenGetter?: () => string | null) {
  const request = makeRequest(tokenGetter);
  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  };
}

export const api = makeApi();
export const ownerApi = makeApi(getOwnerToken);
export const userApi = makeApi(getUserToken);
export const adminApi = makeApi(getAdminToken);

export const PRICE = (n: number) => "$".repeat(Math.max(1, Math.min(4, n)));
export const currency = (n: number) => `$${Math.round(n).toLocaleString()}`;

export const TICKET_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending confirmation", cls: "bg-amber-400/20 text-amber-600" },
  PREPARING: { label: "Preparing", cls: "bg-brand/20 text-brand-dark" },
  READY: { label: "Ready", cls: "bg-emerald-500/20 text-emerald-600" },
  CANCELLED: { label: "Cancelled", cls: "bg-rose-400/20 text-rose-500" },
};
export const DELIVERY_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Order placed", cls: "bg-slate-400/20 text-slate-500" },
  COLLECTING: { label: "Driver collecting items", cls: "bg-amber-400/20 text-amber-600" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", cls: "bg-brand/20 text-brand-dark" },
  DELIVERED: { label: "Delivered", cls: "bg-emerald-500/20 text-emerald-600" },
  CANCELLED: { label: "Cancelled", cls: "bg-rose-400/20 text-rose-500" },
};
export const DELIVERY_STEPS = ["PENDING", "COLLECTING", "OUT_FOR_DELIVERY", "DELIVERED"];

export const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  PROPOSED: { label: "Proposed", cls: "bg-slate-400/20 text-slate-500" },
  FUNDING: { label: "Funding", cls: "bg-amber-400/20 text-amber-600" },
  APPROVED: { label: "Approved", cls: "bg-sky-400/20 text-sky-600" },
  IN_PROGRESS: { label: "In progress", cls: "bg-brand/20 text-brand-dark" },
  COMPLETED: { label: "Completed", cls: "bg-emerald-500/20 text-emerald-600" },
  PAUSED: { label: "Paused", cls: "bg-rose-400/20 text-rose-500" },
};

export const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.max(1, Math.floor(d / 60))}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 2592000) return `${Math.floor(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

export const formatEventDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const dayName = (d: number) => DAYS[d] ?? "";
