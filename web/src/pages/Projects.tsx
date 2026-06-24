import { FormEvent, useEffect, useState } from "react";
import { ProjectCard } from "../components/ProjectCard";
import { CheckIcon, CloseIcon, HandHeartIcon } from "../components/icons";
import { api, currency } from "../lib/api";
import { useUserAuth } from "../context/UserAuthContext";
import type { Project, ProjectStatus, ProjectSummary } from "../types";

const CITY = "aley";
const FILTERS: { key: string; label: string }[] = [
  { key: "", label: "All" },
  { key: "FUNDING", label: "Funding" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "PROPOSED", label: "Proposed" },
];

export function Projects() {
  const { user } = useUserAuth();
  const [status, setStatus] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const load = () => {
    const p = new URLSearchParams({ city: CITY });
    if (status) p.set("status", status);
    api.get<Project[]>(`/api/projects?${p}`).then(setProjects);
  };
  useEffect(() => { api.get<ProjectSummary>(`/api/projects/summary?city=${CITY}`).then(setSummary); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  return (
    <div>
      {/* Hero / stats */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand/15 via-bg to-emerald-400/10" />
        <div className="mx-auto max-w-7xl px-4 py-14">
          <span className="chip !border-brand/30 !bg-brand-soft !text-brand-dark"><HandHeartIcon className="h-4 w-4" /> Community Projects</span>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-extrabold text-ink sm:text-5xl">Fund the projects that make Aley better</h1>
          <p className="mt-3 max-w-xl text-lg text-muted">Like GoFundMe, but only for Aley — trees, lighting, benches, cleanups and more, funded transparently by the community.</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={() => setSuggestOpen(true)} className="btn btn-primary px-6 py-3">+ Suggest a Project</button>
            <div className="flex flex-wrap gap-2 text-sm">
              <Stat value={summary ? currency(summary.totalRaised) : "—"} label="raised so far" />
              <Stat value={summary?.active ?? "—"} label="active projects" />
              <Stat value={summary?.completed ?? "—"} label="completed" />
              <Stat value={summary?.contributors ?? "—"} label="contributors" />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => <button key={f.key} onClick={() => setStatus(f.key)} className={`chip ${status === f.key ? "chip-active" : ""}`}>{f.label}</button>)}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
        {projects.length === 0 && <div className="card mt-6 p-16 text-center text-muted">No projects here yet.</div>}
      </div>

      {suggestOpen && <SuggestModal defaultName={user?.name ?? ""} onClose={() => setSuggestOpen(false)} />}
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <span className="rounded-full bg-surface px-4 py-2 shadow-sm">
      <b className="text-ink">{value}</b> <span className="text-muted">{label}</span>
    </span>
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
