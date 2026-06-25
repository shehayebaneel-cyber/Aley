import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProjectCard } from "../components/ProjectCard";
import { CheckIcon, CloseIcon, HandHeartIcon, StarIcon, UsersIcon } from "../components/icons";
import { useContent } from "../context/ContentContext";
import { api, currency } from "../lib/api";
import { useUserAuth } from "../context/UserAuthContext";
import type { Project, ProjectSummary } from "../types";

const CITY = "aley";
const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "FUNDING", label: "Funding" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "PROPOSED", label: "Proposed" },
];

export function Projects() {
  const c = useContent();
  const { user } = useUserAuth();
  const [status, setStatus] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [completed, setCompleted] = useState<Project[]>([]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const load = () => {
    const p = new URLSearchParams({ city: CITY });
    if (status) p.set("status", status);
    api.get<Project[]>(`/api/projects?${p}`).then(setProjects);
  };
  useEffect(() => {
    api.get<ProjectSummary>(`/api/projects/summary?city=${CITY}`).then(setSummary);
    api.get<Project[]>(`/api/projects?city=${CITY}&status=COMPLETED`).then(setCompleted);
  }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const actions = [
    { icon: "💡", title: "Suggest an improvement", desc: "Propose a project that makes Aley better.", onClick: () => setSuggestOpen(true) },
    { icon: "🗳️", title: "Vote on projects", desc: "Tell us which ideas matter most to you.", to: "#browse" },
    { icon: "💚", title: "Donate", desc: "Fund a project you believe in.", to: "#browse" },
    { icon: "🙌", title: "Volunteer", desc: "Lend your time and skills to the community.", to: "/contact" },
  ];

  const beforeAfter = completed.filter((p) => p.beforePhotos[0] && p.progressPhotos[0]);

  return (
    <div>
      {/* ---- Emotional hero ---- */}
      <section className="relative isolate overflow-hidden">
        <img src={c.loveAley.image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/50 to-black/80" />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center text-white">
          <span className="chip !border-white/30 !bg-white/15 !text-white"><HandHeartIcon className="h-4 w-4" /> Community Projects</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold drop-shadow sm:text-5xl">{c.loveAley.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">{c.loveAley.subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button onClick={() => setSuggestOpen(true)} className="btn btn-primary px-6 py-3"><HandHeartIcon className="h-5 w-5" /> Suggest a project</button>
            <a href="#browse" className="btn bg-white/15 px-6 py-3 text-white backdrop-blur">Browse projects</a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12">
        {/* ---- Stats ---- */}
        {summary && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { v: currency(summary.totalRaised), l: "raised for Aley" },
              { v: summary.active, l: "active projects" },
              { v: summary.completed, l: "completed" },
              { v: summary.contributors, l: "contributors" },
            ].map((s) => (
              <div key={s.l} className="card p-5 text-center">
                <p className="font-display text-3xl font-extrabold text-ink">{s.v}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{s.l}</p>
              </div>
            ))}
          </div>
        )}

        {/* ---- Ways to help ---- */}
        <section>
          <h2 className="font-display text-2xl font-extrabold text-ink">Ways to help</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map((a) =>
              a.to ? (
                a.to.startsWith("#") ? (
                  <a key={a.title} href={a.to} className="card card-hover p-5">
                    <span className="text-3xl">{a.icon}</span>
                    <p className="mt-2 font-display font-bold text-ink">{a.title}</p>
                    <p className="mt-1 text-sm text-muted">{a.desc}</p>
                  </a>
                ) : (
                  <Link key={a.title} to={a.to} className="card card-hover p-5">
                    <span className="text-3xl">{a.icon}</span>
                    <p className="mt-2 font-display font-bold text-ink">{a.title}</p>
                    <p className="mt-1 text-sm text-muted">{a.desc}</p>
                  </Link>
                )
              ) : (
                <button key={a.title} onClick={a.onClick} className="card card-hover p-5 text-left">
                  <span className="text-3xl">{a.icon}</span>
                  <p className="mt-2 font-display font-bold text-ink">{a.title}</p>
                  <p className="mt-1 text-sm text-muted">{a.desc}</p>
                </button>
              )
            )}
          </div>
        </section>

        {/* ---- Project browser ---- */}
        <section id="browse" className="scroll-mt-24">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-extrabold text-ink">Projects</h2>
              <p className="mt-1 text-muted">Like GoFundMe, but only for Aley — funded transparently by the community.</p>
            </div>
            <button onClick={() => setSuggestOpen(true)} className="btn btn-primary px-6 py-3">+ Suggest a project</button>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => <button key={f.key} onClick={() => setStatus(f.key)} className={`chip ${status === f.key ? "chip-active" : ""}`}>{f.label}</button>)}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
          {projects.length === 0 && <div className="card mt-6 p-16 text-center text-muted">No projects here yet.</div>}
        </section>

        {/* ---- Before / after ---- */}
        {beforeAfter.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-extrabold text-ink">Before & after</h2>
            <p className="mt-1 text-muted">Real results, funded by the community.</p>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              {beforeAfter.map((p) => (
                <Link key={p.id} to={`/projects/${p.slug}`} className="card card-hover overflow-hidden">
                  <div className="grid grid-cols-2">
                    <div className="relative"><img src={p.beforePhotos[0]} alt="before" className="aspect-[4/3] w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">Before</span></div>
                    <div className="relative"><img src={p.progressPhotos[0]} alt="after" className="aspect-[4/3] w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-bold text-white">After</span></div>
                  </div>
                  <div className="p-4">
                    <p className="font-display font-bold text-ink">{p.title}</p>
                    <p className="text-sm text-muted">Raised {currency(p.amountRaised)} · {p.contributorCount} contributors</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---- Transparency + Report an issue ---- */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink"><CheckIcon className="h-5 w-5 text-brand" /> Full transparency</h2>
            <p className="mt-2 text-muted">Every project publishes its donations, expenses, receipts, and a final cost report. Nothing is hidden.</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li className="flex items-center gap-2"><UsersIcon className="h-4 w-4 text-brand" /> Public donation lists</li>
              <li className="flex items-center gap-2"><StarIcon className="h-4 w-4 text-brand" /> Itemised expense breakdowns + receipts</li>
              <li className="flex items-center gap-2"><HandHeartIcon className="h-4 w-4 text-brand" /> Contractor quotations & final reports</li>
            </ul>
            <a href="#browse" className="btn btn-ghost mt-4 px-5 py-2.5">View projects</a>
          </section>

          <ReportIssue />
        </div>
      </div>

      {suggestOpen && <SuggestModal defaultName={user?.name ?? ""} onClose={() => setSuggestOpen(false)} />}
    </div>
  );
}

function ReportIssue() {
  const [form, setForm] = useState({ title: "", location: "", description: "", submittedBy: "" });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !form.title.trim()) return;
    setBusy(true);
    try {
      // Recorded for the team as a "report" suggestion.
      await api.post("/api/projects/suggest", { ...form, type: "Issue / Report" });
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="font-display text-xl font-bold text-ink">Report an issue</h2>
      <p className="mt-1 text-sm text-muted">See a pothole, broken light, or something that needs fixing? Let the team know.</p>
      {done ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-600"><CheckIcon className="h-5 w-5" /> Thanks! Your report was submitted.</div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What's the issue?" className="input" />
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="input" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe it…" className="input" />
          <input value={form.submittedBy} onChange={(e) => setForm({ ...form, submittedBy: e.target.value })} placeholder="Your name (optional)" className="input" />
          <button disabled={busy} className="btn btn-primary px-6 py-2.5 disabled:opacity-60">Submit report</button>
        </form>
      )}
    </section>
  );
}

function SuggestModal({ defaultName, onClose }: { defaultName: string; onClose: () => void }) {
  const [form, setForm] = useState({ title: "", type: "", location: "", description: "", fundingGoal: "", submittedBy: defaultName });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/api/projects/suggest", { ...form, fundingGoal: Number(form.fundingGoal) || 0 });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">Suggest a project</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        {done ? (
          <div className="mt-5 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Thank you!</p>
            <p className="mt-1 text-muted">Your idea was submitted and will appear once the team reviews it.</p>
            <button onClick={onClose} className="btn btn-primary mt-5 px-6 py-2.5">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-sm text-muted">Propose something that would improve Aley. The team reviews suggestions before they go live for funding.</p>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project title (e.g. Repaint the school wall)" className="input" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Type (Trees, Lighting…)" className="input" />
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="input" />
            </div>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the project and why it matters" className="input" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.fundingGoal} onChange={(e) => setForm({ ...form, fundingGoal: e.target.value })} inputMode="numeric" placeholder="Funding goal ($)" className="input" />
              <input value={form.submittedBy} onChange={(e) => setForm({ ...form, submittedBy: e.target.value })} placeholder="Your name" className="input" />
            </div>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Submitting…" : "Submit suggestion"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
