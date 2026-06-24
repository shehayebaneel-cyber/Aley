import { useEffect, useState } from "react";
import { ImageField } from "../../components/ImageField";
import { CheckIcon, TrashIcon } from "../../components/icons";
import { DEFAULT_CONTENT, type GemItem, type SiteContent } from "../../context/ContentContext";
import { adminApi } from "../../lib/api";

const TABS = ["Branding", "Hero", "Sections", "Hidden Gems", "Pages"] as const;
type Tab = (typeof TABS)[number];

export function AdminContent() {
  const [c, setC] = useState<SiteContent | null>(null);
  const [tab, setTab] = useState<Tab>("Branding");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { adminApi.get<SiteContent>("/api/admin/content").then(setC).catch(() => setC(DEFAULT_CONTENT)); }, []);
  if (!c) return <div className="card h-72 animate-pulse" />;

  const save = async () => {
    setBusy(true); setSaved(false);
    try { await adminApi.put("/api/admin/content", c); setSaved(true); } finally { setBusy(false); }
  };

  // Immutable nested updaters.
  const setBrand = (p: Partial<SiteContent["brand"]>) => setC({ ...c, brand: { ...c.brand, ...p } });
  const setContact = (p: Partial<SiteContent["contact"]>) => setC({ ...c, contact: { ...c.contact, ...p } });
  const setHero = (p: Partial<SiteContent["hero"]>) => setC({ ...c, hero: { ...c.hero, ...p } });
  const setAbout = (p: Partial<SiteContent["about"]>) => setC({ ...c, about: { ...c.about, ...p } });
  const setLove = (p: Partial<SiteContent["loveAley"]>) => setC({ ...c, loveAley: { ...c.loveAley, ...p } });
  const setSection = (key: keyof SiteContent["sections"], p: Record<string, unknown>) =>
    setC({ ...c, sections: { ...c.sections, [key]: { ...c.sections[key], ...p } } });
  const setGems = (items: GemItem[]) => setC({ ...c, sections: { ...c.sections, gems: { ...c.sections.gems, items } } });

  return (
    <div className="pb-24">
      <h1 className="font-display text-3xl font-extrabold text-ink">Site Content</h1>
      <p className="mt-1 text-muted">Edit the homepage, branding, and page text — changes go live instantly.</p>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === t ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>{t}</button>
        ))}
      </div>

      <div className="mt-6 max-w-3xl space-y-6">
        {tab === "Branding" && (
          <>
            <Card title="Brand">
              <Field label="Site name" value={c.brand.name} onChange={(v) => setBrand({ name: v })} />
              <Field label="Tagline" value={c.brand.tagline} onChange={(v) => setBrand({ tagline: v })} />
              <Area label="Footer description" value={c.brand.footerText} onChange={(v) => setBrand({ footerText: v })} />
            </Card>
            <Card title="Contact details">
              <Field label="Address" value={c.contact.address} onChange={(v) => setContact({ address: v })} />
              <Field label="Phone" value={c.contact.phone} onChange={(v) => setContact({ phone: v })} />
              <Field label="Email" value={c.contact.email} onChange={(v) => setContact({ email: v })} />
              <Field label="Instagram handle (no @)" value={c.contact.instagram} onChange={(v) => setContact({ instagram: v })} />
            </Card>
          </>
        )}

        {tab === "Hero" && (
          <Card title="Homepage hero">
            <Field label="Badge (blank = city name)" value={c.hero.badge} onChange={(v) => setHero({ badge: v })} />
            <Field label="Headline" value={c.hero.title} onChange={(v) => setHero({ title: v })} />
            <Area label="Subtext" value={c.hero.subtitle} onChange={(v) => setHero({ subtitle: v })} />
            <Field label="Search placeholder" value={c.hero.searchPlaceholder} onChange={(v) => setHero({ searchPlaceholder: v })} />
            <Label>Background image</Label>
            <ImageField value={c.hero.image} uploadWith={adminApi} onChange={(url) => setHero({ image: url ?? "" })} label="hero image" />
          </Card>
        )}

        {tab === "Sections" && (
          <Card title="Homepage sections">
            <p className="text-sm text-muted">Toggle sections on/off and rename their headings.</p>
            <SectionRow label="Trust stats bar" meta={c.sections.stats} onToggle={(show) => setSection("stats", { show })} />
            {(["categories", "featured", "community", "gems", "offers", "events", "mapCta"] as const).map((key) => (
              <SectionRow
                key={key}
                label={LABELS[key]}
                meta={c.sections[key]}
                titled
                onToggle={(show) => setSection(key, { show })}
                onTitle={(title) => setSection(key, { title })}
                onSubtitle={(subtitle) => setSection(key, { subtitle })}
              />
            ))}
          </Card>
        )}

        {tab === "Hidden Gems" && (
          <Card title="Hidden Gems cards">
            <Field label="Section title" value={c.sections.gems.title ?? ""} onChange={(v) => setSection("gems", { title: v })} />
            <Field label="Section subtitle" value={c.sections.gems.subtitle ?? ""} onChange={(v) => setSection("gems", { subtitle: v })} />
            <div className="space-y-4">
              {c.sections.gems.items.map((g, i) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold text-ink">Card {i + 1}</span><button onClick={() => setGems(c.sections.gems.items.filter((_, j) => j !== i))} className="text-red-500"><TrashIcon className="h-4 w-4" /></button></div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input value={g.title} onChange={(e) => setGems(c.sections.gems.items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Title" className="input" />
                    <input value={g.sub} onChange={(e) => setGems(c.sections.gems.items.map((x, j) => (j === i ? { ...x, sub: e.target.value } : x)))} placeholder="Subtitle" className="input" />
                    <input value={g.to} onChange={(e) => setGems(c.sections.gems.items.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} placeholder="Link (e.g. /explore?q=breakfast)" className="input sm:col-span-2" />
                  </div>
                  <div className="mt-2"><ImageField value={g.img} uploadWith={adminApi} onChange={(url) => setGems(c.sections.gems.items.map((x, j) => (j === i ? { ...x, img: url ?? "" } : x)))} label="card image" /></div>
                </div>
              ))}
              <button onClick={() => setGems([...c.sections.gems.items, { title: "New gem", sub: "", to: "/explore", img: "" }])} className="chip">+ Add card</button>
            </div>
          </Card>
        )}

        {tab === "Pages" && (
          <>
            <Card title="About page">
              <Field label="Title" value={c.about.title} onChange={(v) => setAbout({ title: v })} />
              <Area label="Story text" value={c.about.body} onChange={(v) => setAbout({ body: v })} />
              <Label>Hero image</Label>
              <ImageField value={c.about.image} uploadWith={adminApi} onChange={(url) => setAbout({ image: url ?? "" })} label="about image" />
            </Card>
            <Card title="Love Aley page">
              <Field label="Title" value={c.loveAley.title} onChange={(v) => setLove({ title: v })} />
              <Area label="Subtitle" value={c.loveAley.subtitle} onChange={(v) => setLove({ subtitle: v })} />
              <Label>Hero image</Label>
              <ImageField value={c.loveAley.image} uploadWith={adminApi} onChange={(url) => setLove({ image: url ?? "" })} label="love aley image" />
            </Card>
          </>
        )}
      </div>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:left-60">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button onClick={save} disabled={busy} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">{busy ? "Saving…" : "Save & publish"}</button>
          {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckIcon className="h-4 w-4" /> Saved — live now</span>}
          <a href="/" target="_blank" rel="noreferrer" className="ml-auto text-sm font-semibold text-brand">Preview site →</a>
        </div>
      </div>
    </div>
  );
}

const LABELS: Record<string, string> = {
  categories: "Popular categories", featured: "Featured businesses", community: "Help Build Aley",
  gems: "Hidden Gems", offers: "Current offers", events: "Upcoming events", mapCta: "Map call-to-action",
};

function SectionRow({ label, meta, titled, onToggle, onTitle, onSubtitle }: {
  label: string; meta: { show: boolean; title?: string; subtitle?: string }; titled?: boolean;
  onToggle: (v: boolean) => void; onTitle?: (v: string) => void; onSubtitle?: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">{label}</span>
        <button onClick={() => onToggle(!meta.show)} className={`chip ${meta.show ? "chip-active" : ""}`}>{meta.show ? "Visible" : "Hidden"}</button>
      </div>
      {titled && meta.show && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input value={meta.title ?? ""} onChange={(e) => onTitle?.(e.target.value)} placeholder="Title" className="input" />
          <input value={meta.subtitle ?? ""} onChange={(e) => onSubtitle?.(e.target.value)} placeholder="Subtitle" className="input" />
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card space-y-3 p-5"><h2 className="font-display text-lg font-bold text-ink">{title}</h2>{children}</section>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <span className="block text-sm font-semibold text-ink">{children}</span>;
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block"><Label>{label}</Label><input value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1" /></label>;
}
function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block"><Label>{label}</Label><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="input mt-1" /></label>;
}
