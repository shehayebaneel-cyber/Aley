import { useState } from "react";
import { ImageField } from "./ImageField";
import { CheckIcon, TrashIcon } from "./icons";
import type { ProductChoice, ProductItem, ProductOptionGroup, ProductSection } from "../types";

type Uploader = { post: <T>(path: string, body: unknown) => Promise<T> };

const inp = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";
const DIETS: { key: string; label: string }[] = [
  { key: "vegetarian", label: "🥗 Vegetarian" },
  { key: "vegan", label: "🌱 Vegan" },
  { key: "gluten-free", label: "🌾 Gluten-free" },
];
const BADGES = ["Best Seller", "Most Popular", "New", "Limited Time", "Chef's Pick"];

const move = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

/** Shared menu/products editor used by both the owner dashboard and admin panel. */
export function MenuEditor({
  initialSections, initialLabel, uploader, onSave,
}: {
  initialSections: ProductSection[];
  initialLabel: string;
  uploader: Uploader;
  onSave: (sections: ProductSection[], label: string) => Promise<unknown>;
}) {
  const [label, setLabel] = useState(initialLabel || "Menu");
  const [sections, setSections] = useState<ProductSection[]>(initialSections ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setSec = (si: number, patch: Partial<ProductSection>) =>
    setSections((s) => s.map((sec, i) => (i === si ? { ...sec, ...patch } : sec)));
  const setItem = (si: number, ii: number, patch: Partial<ProductItem>) =>
    setSec(si, { items: sections[si].items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) });
  const removeItem = (si: number, ii: number) => setSec(si, { items: sections[si].items.filter((_, j) => j !== ii) });
  const addItem = (si: number) => setSec(si, { items: [...sections[si].items, { name: "", available: true }] });
  const moveItem = (si: number, ii: number, dir: -1 | 1) => setSec(si, { items: move(sections[si].items, ii, dir) });
  const moveItemToSection = (si: number, ii: number, targetSi: number) => {
    if (targetSi === si) return;
    const item = sections[si].items[ii];
    setSections((s) => s.map((sec, i) => {
      if (i === si) return { ...sec, items: sec.items.filter((_, j) => j !== ii) };
      if (i === targetSi) return { ...sec, items: [...sec.items, item] };
      return sec;
    }));
  };

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await onSave(sections.filter((s) => s.title.trim()), label);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-ink">
        Section heading shown on your page (e.g. Menu, Collection, Rooms)
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={`${inp} mt-1`} />
      </label>

      {sections.map((sec, si) => (
        <div key={si} className="card p-4">
          <div className="flex items-center gap-2">
            <input value={sec.title} onChange={(e) => setSec(si, { title: e.target.value })} placeholder="Section title (e.g. Hot Drinks)" className={`${inp} font-semibold`} />
            <button onClick={() => setSections(move(sections, si, -1))} disabled={si === 0} className="btn btn-ghost h-9 w-9 !p-0 disabled:opacity-30" title="Move section up">↑</button>
            <button onClick={() => setSections(move(sections, si, 1))} disabled={si === sections.length - 1} className="btn btn-ghost h-9 w-9 !p-0 disabled:opacity-30" title="Move section down">↓</button>
            <button onClick={() => setSections(sections.filter((_, j) => j !== si))} className="btn btn-ghost h-9 w-9 !p-0 text-red-500" title="Delete section"><TrashIcon className="h-4 w-4" /></button>
          </div>

          <div className="mt-3 space-y-3">
            {sec.items.map((it, ii) => (
              <ItemEditor
                key={ii}
                item={it}
                uploader={uploader}
                sectionIndex={si}
                sectionTitles={sections.map((s) => s.title)}
                canUp={ii > 0}
                canDown={ii < sec.items.length - 1}
                onChange={(patch) => setItem(si, ii, patch)}
                onRemove={() => removeItem(si, ii)}
                onMove={(dir) => moveItem(si, ii, dir)}
                onMoveToSection={(target) => moveItemToSection(si, ii, target)}
              />
            ))}
            <button onClick={() => addItem(si)} className="chip">+ Add item</button>
          </div>
        </div>
      ))}

      <button onClick={() => setSections([...sections, { title: "New section", items: [] }])} className="chip">+ Add section</button>

      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-border bg-surface/95 px-1 py-3 backdrop-blur">
        <button onClick={handleSave} disabled={saving} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{saving ? "Saving…" : "Save menu"}</button>
        {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckIcon className="h-4 w-4" /> Saved</span>}
      </div>
    </div>
  );
}

function ItemEditor({
  item, uploader, sectionIndex, sectionTitles, canUp, canDown, onChange, onRemove, onMove, onMoveToSection,
}: {
  item: ProductItem;
  uploader: Uploader;
  sectionIndex: number;
  sectionTitles: string[];
  canUp: boolean;
  canDown: boolean;
  onChange: (patch: Partial<ProductItem>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onMoveToSection: (target: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = item.available !== false;
  const diet = item.diet ?? [];
  const toggleDiet = (key: string) => onChange({ diet: diet.includes(key) ? diet.filter((d) => d !== key) : [...diet, key] });

  return (
    <div className={`rounded-xl border border-border p-3 ${!available ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="w-20 shrink-0">
          <ImageField value={item.image ?? null} uploadWith={uploader} onChange={(image) => onChange({ image })} aspect="aspect-square" label="photo" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <input value={item.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Item name" className={`${inp} font-semibold`} />
            <input value={item.price ?? ""} onChange={(e) => onChange({ price: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="$" inputMode="decimal" className={`${inp} w-24`} />
          </div>
          <textarea value={item.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} rows={2} placeholder="Short description (optional)" className={inp} />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <label className="inline-flex items-center gap-1.5 font-medium text-ink"><input type="checkbox" checked={!!item.featured} onChange={(e) => onChange({ featured: e.target.checked })} /> ⭐ Featured</label>
            <label className="inline-flex items-center gap-1.5 font-medium text-ink"><input type="checkbox" checked={available} onChange={(e) => onChange({ available: e.target.checked })} /> Available</label>
            <button type="button" onClick={() => setOpen((o) => !o)} className="font-semibold text-brand">{open ? "Hide details" : "More details & options"}</button>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button onClick={() => onMove(-1)} disabled={!canUp} className="btn btn-ghost h-8 w-8 !p-0 disabled:opacity-30" title="Move up">↑</button>
          <button onClick={() => onMove(1)} disabled={!canDown} className="btn btn-ghost h-8 w-8 !p-0 disabled:opacity-30" title="Move down">↓</button>
          <button onClick={onRemove} className="btn btn-ghost h-8 w-8 !p-0 text-red-500" title="Delete item"><TrashIcon className="h-4 w-4" /></button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm font-semibold text-ink">Badge
              <input list="menu-badges" value={item.badge ?? ""} onChange={(e) => onChange({ badge: e.target.value || undefined })} placeholder="e.g. Best Seller" className={`${inp} mt-1`} />
              <datalist id="menu-badges">{BADGES.map((b) => <option key={b} value={b} />)}</datalist>
            </label>
            {sectionTitles.length > 1 && (
              <label className="text-sm font-semibold text-ink">Move to section
                <select value={sectionIndex} onChange={(e) => onMoveToSection(Number(e.target.value))} className={`${inp} mt-1`}>
                  {sectionTitles.map((t, i) => <option key={i} value={i}>{t || `Section ${i + 1}`}</option>)}
                </select>
              </label>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-ink">Dietary</p>
            <div className="mt-1 flex flex-wrap gap-3 text-sm">
              {DIETS.map((d) => (
                <label key={d.key} className="inline-flex items-center gap-1.5 text-ink"><input type="checkbox" checked={diet.includes(d.key)} onChange={() => toggleDiet(d.key)} /> {d.label}</label>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm font-semibold text-ink">Ingredients (optional)
              <input value={item.ingredients ?? ""} onChange={(e) => onChange({ ingredients: e.target.value || undefined })} className={`${inp} mt-1`} />
            </label>
            <label className="text-sm font-semibold text-ink">Allergens (optional)
              <input value={item.allergens ?? ""} onChange={(e) => onChange({ allergens: e.target.value || undefined })} className={`${inp} mt-1`} />
            </label>
          </div>

          <OptionsEditor groups={item.options ?? []} onChange={(options) => onChange({ options: options.length ? options : undefined })} />
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ groups, onChange }: { groups: ProductOptionGroup[]; onChange: (g: ProductOptionGroup[]) => void }) {
  const setGroup = (gi: number, patch: Partial<ProductOptionGroup>) => onChange(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setChoice = (gi: number, ci: number, patch: Partial<ProductChoice>) =>
    setGroup(gi, { choices: groups[gi].choices.map((c, j) => (j === ci ? { ...c, ...patch } : c)) });

  return (
    <div className="rounded-xl surface-2 p-3">
      <p className="text-sm font-semibold text-ink">Customization options</p>
      <p className="text-xs text-muted">e.g. Size, Milk, Extras. Add a price to charge extra for a choice.</p>
      <div className="mt-2 space-y-3">
        {groups.map((g, gi) => (
          <div key={gi} className="rounded-lg border border-border bg-surface p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <input value={g.name} onChange={(e) => setGroup(gi, { name: e.target.value })} placeholder="Group name (e.g. Size)" className={`${inp} flex-1`} />
              <select value={g.type} onChange={(e) => setGroup(gi, { type: e.target.value as "single" | "multi" })} className={`${inp} w-32`}>
                <option value="single">Pick one</option>
                <option value="multi">Pick any</option>
              </select>
              <label className="inline-flex items-center gap-1.5 text-sm text-ink"><input type="checkbox" checked={!!g.required} onChange={(e) => setGroup(gi, { required: e.target.checked })} /> Required</label>
              <button onClick={() => onChange(groups.filter((_, j) => j !== gi))} className="btn btn-ghost h-8 w-8 !p-0 text-red-500"><TrashIcon className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 space-y-1.5">
              {g.choices.map((c, ci) => (
                <div key={ci} className="flex items-center gap-2">
                  <input value={c.label} onChange={(e) => setChoice(gi, ci, { label: e.target.value })} placeholder="Choice (e.g. Large)" className={`${inp} flex-1`} />
                  <div className="relative w-28">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted">+$</span>
                    <input value={c.price ?? ""} onChange={(e) => setChoice(gi, ci, { price: e.target.value === "" ? undefined : Number(e.target.value) })} placeholder="0" inputMode="decimal" className={`${inp} !pl-7`} />
                  </div>
                  <button onClick={() => setGroup(gi, { choices: g.choices.filter((_, j) => j !== ci) })} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
                </div>
              ))}
              <button onClick={() => setGroup(gi, { choices: [...g.choices, { label: "" }] })} className="chip !text-xs">+ Add choice</button>
            </div>
          </div>
        ))}
        <button onClick={() => onChange([...groups, { name: "", type: "single", choices: [] }])} className="chip">+ Add option group</button>
      </div>
    </div>
  );
}
