import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BusinessCard } from "../components/BusinessCard";
import { ChevronRight, SearchIcon } from "../components/icons";
import { useLang } from "../context/LanguageContext";
import { useFetch } from "../lib/useFetch";
import type { Business, Category } from "../types";

const CITY = "aley";
const GROUP_ORDER = ["Food & Drinks", "Shopping", "Health & Beauty", "Automotive", "Home & Living", "Professional Services", "Stay & Tourism", "Education", "Entertainment", "Community", "Essential Services", "More"];
// Emoji per group, shown in the sidebar / chips.
const GROUP_ICON: Record<string, string> = {
  "Food & Drinks": "🍴", "Shopping": "🛍️", "Health & Beauty": "💄", "Automotive": "🚗",
  "Home & Living": "🏠", "Professional Services": "💼", "Stay & Tourism": "🏨", "Education": "🎓",
  "Entertainment": "🎭", "Community": "📢", "Essential Services": "🚨", "More": "🏷️",
};
const groupIcon = (g: string) => GROUP_ICON[g] ?? "🏷️";

const SORTS = [
  { key: "", tk: "sort.recommended" },
  { key: "rating", tk: "sort.topRated" },
  { key: "reviews", tk: "sort.mostReviewed" },
  { key: "newest", tk: "sort.newest" },
  { key: "name", tk: "sort.az" },
];

export function Explore() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const { data: categories } = useFetch<Category[]>(`/api/categories?city=${CITY}`);
  const cats = categories ?? [];

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const toggle = (key: string) => set(key, params.get(key) === "true" ? "" : "true");
  const choose = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: true });
  };

  const query = useMemo(() => {
    const p = new URLSearchParams(params);
    p.set("city", CITY);
    return p.toString();
  }, [params]);

  const { data: businesses, loading } = useFetch<Business[]>(`/api/businesses?${query}`);
  const activeCategory = params.get("category") ?? "";
  const activeGroup = params.get("group") ?? "";

  // Idle = nothing chosen yet → show the visual "browse by category" tiles instead of results.
  const FILTER_KEYS = ["category", "group", "q", "openNow", "delivery", "reservations", "minRating", "priceMax", "sort"];
  const hasFilter = FILTER_KEYS.some((k) => params.get(k));

  // Group the categories in a fixed order.
  const grouped = useMemo(() => {
    const byGroup = new Map<string, Category[]>();
    for (const c of cats) {
      const g = c.group || "More";
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(c);
    }
    const ordered = GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, items: byGroup.get(g)! }));
    for (const [g, items] of byGroup) if (!GROUP_ORDER.includes(g)) ordered.push({ group: g, items });
    return ordered;
  }, [cats]);

  const [open, setOpen] = useState<Set<string>>(new Set());
  const activeCatGroup = cats.find((c) => c.slug === activeCategory)?.group;
  const isOpen = (g: string) => open.has(g) || g === activeGroup || g === activeCatGroup;
  const toggleGroup = (g: string) => setOpen((prev) => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-ink">{t("explore.title")}</h1>
      <p className="mt-1 text-muted">{!hasFilter ? t("explore.browse") : loading ? t("explore.loading") : t("explore.placesFound", { n: businesses?.length ?? 0 })}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        {/* ---- Grouped category sidebar (desktop) ---- */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[78vh] space-y-1 overflow-y-auto pr-1">
            <button onClick={() => choose({ category: null, group: null })} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold ${!activeCategory && !activeGroup ? "bg-brand-soft text-brand-dark" : "text-ink hover:bg-surface-2"}`}>
              🗂️ {t("explore.allCategories")}
            </button>
            {grouped.map(({ group, items }) => (
              <div key={group}>
                <div className={`flex items-center rounded-xl ${activeGroup === group ? "bg-brand-soft" : "hover:bg-surface-2"}`}>
                  <button onClick={() => choose({ group, category: null })} className={`flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm font-bold ${activeGroup === group ? "text-brand-dark" : "text-ink"}`}><span className="text-base leading-none">{groupIcon(group)}</span>{group}</button>
                  <button onClick={() => toggleGroup(group)} aria-label="Toggle" className="px-2 py-2 text-muted">
                    <ChevronRight className={`h-4 w-4 transition ${isOpen(group) ? "rotate-90" : ""}`} />
                  </button>
                </div>
                {isOpen(group) && (
                  <div className="ml-2 border-l border-border pl-2">
                    {items.map((c) => (
                      <button key={c.id} onClick={() => choose({ category: c.slug, group: null })} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${activeCategory === c.slug ? "bg-brand-soft font-semibold text-brand-dark" : "text-muted hover:bg-surface-2 hover:text-ink"}`}>
                        <span className="text-base leading-none">{c.icon}</span>
                        <span className="flex-1 truncate">{c.name}</span>
                        <span className="text-xs">{c.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* ---- Main column ---- */}
        <div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input defaultValue={params.get("q") ?? ""} onChange={(e) => set("q", e.target.value)} placeholder={t("common.searchPlaceholder")} className="input !pl-9" />
          </div>

          {/* Mobile: group chips, then sub-categories of the active group */}
          <div className="lg:hidden">
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => choose({ category: null, group: null })} className={`chip whitespace-nowrap ${!activeCategory && !activeGroup ? "chip-active" : ""}`}>{t("explore.all")}</button>
              {grouped.map(({ group }) => (
                <button key={group} onClick={() => choose({ group, category: null })} className={`chip whitespace-nowrap ${activeGroup === group || activeCatGroup === group ? "chip-active" : ""}`}>{groupIcon(group)} {group}</button>
              ))}
            </div>
            {(activeGroup || activeCatGroup) && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {(grouped.find((g) => g.group === (activeGroup || activeCatGroup))?.items ?? []).map((c) => (
                  <button key={c.id} onClick={() => choose({ category: c.slug, group: null })} className={`chip whitespace-nowrap ${activeCategory === c.slug ? "chip-active" : ""}`}>{c.icon} {c.name}</button>
                ))}
              </div>
            )}
          </div>

          {/* Filters + sort */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => toggle("openNow")} className={`chip ${params.get("openNow") === "true" ? "chip-active" : ""}`}>{t("filter.openNow")}</button>
            <button onClick={() => toggle("delivery")} className={`chip ${params.get("delivery") === "true" ? "chip-active" : ""}`}>{t("filter.delivery")}</button>
            <button onClick={() => toggle("reservations")} className={`chip ${params.get("reservations") === "true" ? "chip-active" : ""}`}>{t("filter.reservations")}</button>
            <button onClick={() => set("minRating", params.get("minRating") === "4" ? "" : "4")} className={`chip ${params.get("minRating") === "4" ? "chip-active" : ""}`}>{t("filter.rating4")}</button>
            <select value={params.get("priceMax") ?? ""} onChange={(e) => set("priceMax", e.target.value)} className="chip cursor-pointer">
              <option value="">{t("price.any")}</option>
              <option value="1">{t("price.1")}</option>
              <option value="2">{t("price.2")}</option>
              <option value="3">{t("price.3")}</option>
            </select>
            <select value={params.get("sort") ?? ""} onChange={(e) => set("sort", e.target.value)} className="chip ml-auto cursor-pointer">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{t(s.tk)}</option>)}
            </select>
          </div>

          {/* Idle: browse-by-category tiles. Otherwise: results. */}
          <div className="mt-6">
            {!hasFilter ? (
              <div className="space-y-8">
                {grouped.map(({ group, items }) => (
                  <section key={group}>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="font-display text-lg font-extrabold text-ink">{group}</h2>
                      <button onClick={() => choose({ group, category: null })} className="text-sm font-semibold text-brand hover:text-brand-dark">{t("explore.seeAll")}</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {items.map((c) => (
                        <button key={c.id} onClick={() => choose({ category: c.slug, group: null })} className="card card-hover group flex items-center gap-3 p-4 text-left">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition group-hover:scale-110" style={{ background: `${c.color}1a` }}>{c.icon}</span>
                          <div className="min-w-0">
                            <p className="truncate font-display font-bold text-ink">{c.name}</p>
                            <p className="text-sm text-muted">{c.count} {t(c.count === 1 ? "explore.place" : "explore.places")}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="card h-72 animate-pulse" />)}</div>
            ) : businesses && businesses.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{businesses.map((b) => <BusinessCard key={b.id} business={b} showActions />)}</div>
            ) : (
              <div className="card p-16 text-center">
                <p className="text-lg font-semibold text-ink">{t("explore.noResults")}</p>
                <p className="mt-1 text-muted">{t("explore.noResultsHint")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
