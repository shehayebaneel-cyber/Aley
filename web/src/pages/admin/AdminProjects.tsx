import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ImageField } from "../../components/ImageField";
import { CheckIcon, TrashIcon } from "../../components/icons";
import { adminApi, currency, PROJECT_STATUS } from "../../lib/api";
import type { Milestone, Project, ProjectDonation, ProjectExpense, ProjectUpdate } from "../../types";

const STATUSES = ["PROPOSED", "FUNDING", "APPROVED", "IN_PROGRESS", "COMPLETED", "PAUSED"];

export function AdminProjects() {
  const [list, setList] = useState<Project[]>([]);
  const [sel, setSel] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);

  const loadList = () => adminApi.get<Project[]>("/api/admin/projects").then(setList);
  const loadSel = (id: number) => adminApi.get<Project>(`/api/projects/${list.find((p) => p.id === id)?.slug ?? ""}`).catch(() => null).then((p) => p && setSel(p));
  useEffect(() => { loadList(); }, []);

  // When picking from list, fetch the full public detail (donations/expenses/updates).
  const open = async (p: Project) => {
    const full = await adminApi.get<Project>(`/api/projects/${p.slug}`).catch(() => p);
    setSel(full);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-extrabold text-ink">Community Projects</h1>
        <button onClick={() => setCreating(true)} className="btn btn-primary px-5 py-2.5">+ New project</button>
      </div>

      {creating && <CreateForm onClose={() => setCreating(false)} onCreated={() => { setCreating(false); loadList(); }} />}

      <div className="mt-5 grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-2">
          {list.map((p) => (
            <button key={p.id} onClick={() => open(p)} className={`card w-full p-4 text-left transition ${sel?.id === p.id ? "ring-2 ring-brand" : "card-hover"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 font-semibold text-ink">{p.title}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PROJECT_STATUS[p.status].cls}`}>{PROJECT_STATUS[p.status].label}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{currency(p.amountRaised)} / {currency(p.fundingGoal)} · {p.contributorCount} donors{p.submittedBy ? ` · by ${p.submittedBy}` : ""}</p>
            </button>
          ))}
        </div>

        <div>
          {sel ? <Editor key={sel.id} project={sel} onChange={() => { open(sel); loadList(); }} onDeleted={() => { setSel(null); loadList(); }} /> : <div className="card p-16 text-center text-muted">Select a project to manage it.</div>}
        </div>
      </div>
    </div>
  );
}

function CreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ title: "", type: "", location: "", fundingGoal: "", manager: "", status: "FUNDING", description: "" });
  return (
    <form
      onSubmit={async (e: FormEvent) => { e.preventDefault(); await adminApi.post("/api/admin/projects", { ...f, fundingGoal: Number(f.fundingGoal) || 0 }); onCreated(); }}
      className="card mt-4 grid gap-3 p-5 sm:grid-cols-2"
    >
      <input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" className="input sm:col-span-2" />
      <input value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} placeholder="Type" className="input" />
      <input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Location" className="input" />
      <input value={f.fundingGoal} onChange={(e) => setF({ ...f, fundingGoal: e.target.value })} placeholder="Funding goal ($)" className="input" />
      <input value={f.manager} onChange={(e) => setF({ ...f, manager: e.target.value })} placeholder="Manager" className="input" />
      <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Description" className="input sm:col-span-2" rows={3} />
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn btn-primary px-5 py-2.5">Create</button>
        <button type="button" onClick={onClose} className="btn btn-ghost px-5 py-2.5">Cancel</button>
      </div>
    </form>
  );
}

function Editor({ project, onChange, onDeleted }: { project: Project; onChange: () => void; onDeleted: () => void }) {
  const [f, setF] = useState({
    status: project.status, fundingGoal: String(project.fundingGoal), manager: project.manager,
    isFeatured: project.isFeatured, isPublished: project.isPublished ?? true,
    description: project.description, finalCost: project.finalCost?.toString() ?? "", completedReport: project.completedReport,
  });
  const [timeline, setTimeline] = useState<Milestone[]>(project.timeline);
  const [saved, setSaved] = useState(false);

  const patch = async (body: Record<string, unknown>) => { await adminApi.patch(`/api/admin/projects/${project.id}`, body); setSaved(true); onChange(); };

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink">{project.title}</h2>
          <Link to={`/projects/${project.slug}`} target="_blank" className="text-sm font-semibold text-brand">View public →</Link>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink">Status
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Project["status"] })} className="input mt-1">
              {STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS[s].label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-ink">Funding goal ($)
            <input value={f.fundingGoal} onChange={(e) => setF({ ...f, fundingGoal: e.target.value })} className="input mt-1" inputMode="numeric" />
          </label>
          <label className="text-sm font-semibold text-ink sm:col-span-2">Manager
            <input value={f.manager} onChange={(e) => setF({ ...f, manager: e.target.value })} className="input mt-1" />
          </label>
          <label className="text-sm font-semibold text-ink sm:col-span-2">Description
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className="input mt-1" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setF({ ...f, isFeatured: !f.isFeatured })} className={`chip ${f.isFeatured ? "chip-active" : ""}`}>Featured</button>
          <button onClick={() => setF({ ...f, isPublished: !f.isPublished })} className={`chip ${f.isPublished ? "chip-active" : ""}`}>{f.isPublished ? "Published" : "Hidden"}</button>
        </div>
        {f.status === "COMPLETED" && (
          <div className="mt-3 grid gap-3">
            <label className="text-sm font-semibold text-ink">Final cost ($)<input value={f.finalCost} onChange={(e) => setF({ ...f, finalCost: e.target.value })} className="input mt-1" /></label>
            <label className="text-sm font-semibold text-ink">Completed report<textarea value={f.completedReport} onChange={(e) => setF({ ...f, completedReport: e.target.value })} rows={3} className="input mt-1" /></label>
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => patch({ status: f.status, fundingGoal: Number(f.fundingGoal) || 0, manager: f.manager, isFeatured: f.isFeatured, isPublished: f.isPublished, description: f.description, finalCost: f.finalCost === "" ? null : Number(f.finalCost), completedReport: f.completedReport, timeline })} className="btn btn-primary px-6 py-2.5">Save changes</button>
          {saved && <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckIcon className="h-4 w-4" /> Saved</span>}
          <button onClick={() => { if (confirm(`Delete "${project.title}"?`)) { adminApi.delete(`/api/admin/projects/${project.id}`).then(onDeleted); } }} className="btn btn-ghost ml-auto px-4 py-2 text-sm text-red-500"><TrashIcon className="h-4 w-4" /> Delete</button>
        </div>
      </div>

      {/* Timeline / milestones */}
      <div className="card p-5">
        <h3 className="font-display font-bold text-ink">Milestones</h3>
        <div className="mt-3 space-y-2">
          {timeline.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <button onClick={() => setTimeline(timeline.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} className={`flex h-7 w-7 items-center justify-center rounded-full ${m.done ? "bg-brand text-white" : "surface-2 text-muted"}`}><CheckIcon className="h-4 w-4" /></button>
              <input value={m.label} onChange={(e) => setTimeline(timeline.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="input !py-2 text-sm" />
              <button onClick={() => setTimeline(timeline.filter((_, j) => j !== i))} className="btn btn-ghost h-9 w-9 !p-0 text-red-500"><TrashIcon className="h-4 w-4" /></button>
            </div>
          ))}
          <button onClick={() => setTimeline([...timeline, { label: "New milestone", date: "", done: false }])} className="chip">+ Add milestone</button>
        </div>
        <button onClick={() => patch({ timeline })} className="btn btn-primary mt-3 px-5 py-2 text-sm">Save milestones</button>
      </div>

      {/* Photos */}
      <div className="card p-5">
        <h3 className="font-display font-bold text-ink">Photos</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {(["beforePhotos", "proposedPhotos", "progressPhotos"] as const).map((key) => (
            <PhotoSetEditor key={key} label={key === "beforePhotos" ? "Before" : key === "proposedPhotos" ? "Proposed" : "Progress"} photos={(project[key] as string[]) ?? []} onSave={(arr) => patch({ [key]: arr })} />
          ))}
        </div>
      </div>

      <Updates project={project} onChange={onChange} />
      <Expenses project={project} onChange={onChange} />
      <DonationsList project={project} onChange={onChange} />
    </div>
  );
}

function PhotoSetEditor({ label, photos, onSave }: { label: string; photos: string[]; onSave: (arr: string[]) => void }) {
  const [arr, setArr] = useState<string[]>(photos);
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{label}</p>
      <div className="mt-2 space-y-2">
        {arr.map((src, i) => (
          <div key={i} className="relative">
            <img src={src} alt="" className="aspect-video w-full rounded-lg object-cover" />
            <button onClick={() => { const next = arr.filter((_, j) => j !== i); setArr(next); onSave(next); }} className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">×</button>
          </div>
        ))}
        <ImageField value={null} uploadWith={adminApi} onChange={(url) => { if (url) { const next = [...arr, url]; setArr(next); onSave(next); } }} label={`${label.toLowerCase()} photo`} />
      </div>
    </div>
  );
}

function Updates({ project, onChange }: { project: Project; onChange: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const updates = project.updates ?? [];
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await adminApi.post(`/api/admin/projects/${project.id}/updates`, { title, body });
    setTitle(""); setBody(""); onChange();
  }
  return (
    <div className="card p-5">
      <h3 className="font-display font-bold text-ink">Updates</h3>
      <form onSubmit={add} className="mt-3 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Update title" className="input" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="What happened?" className="input" />
        <button className="btn btn-primary px-5 py-2 text-sm">Post update</button>
      </form>
      <div className="mt-3 space-y-2">
        {updates.map((u: ProjectUpdate) => (
          <div key={u.id} className="flex items-center justify-between rounded-xl surface-2 p-3">
            <span className="text-sm font-semibold text-ink">{u.title}</span>
            <button onClick={async () => { await adminApi.delete(`/api/admin/updates/${u.id}`); onChange(); }} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Expenses({ project, onChange }: { project: Project; onChange: () => void }) {
  const [f, setF] = useState({ label: "", amount: "", contractor: "", receipt: null as string | null });
  const expenses = project.expenses ?? [];
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!f.label.trim()) return;
    await adminApi.post(`/api/admin/projects/${project.id}/expenses`, { ...f, amount: Number(f.amount) || 0 });
    setF({ label: "", amount: "", contractor: "", receipt: null }); onChange();
  }
  return (
    <div className="card p-5">
      <h3 className="font-display font-bold text-ink">Expenses & receipts</h3>
      <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Expense (e.g. Paint)" className="input" />
        <input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="Amount ($)" className="input" inputMode="numeric" />
        <input value={f.contractor} onChange={(e) => setF({ ...f, contractor: e.target.value })} placeholder="Contractor / quotation" className="input sm:col-span-2" />
        <div className="sm:col-span-2"><ImageField value={f.receipt} uploadWith={adminApi} onChange={(receipt) => setF({ ...f, receipt })} label="receipt" aspect="aspect-[4/3]" /></div>
        <button className="btn btn-primary px-5 py-2 text-sm sm:col-span-2">Add expense</button>
      </form>
      <div className="mt-3 space-y-2">
        {expenses.map((e: ProjectExpense) => (
          <div key={e.id} className="flex items-center gap-3 rounded-xl surface-2 p-3 text-sm">
            <span className="flex-1 font-semibold text-ink">{e.label}</span>
            <span className="text-ink">{currency(e.amount)}</span>
            {e.receipt && <a href={e.receipt} target="_blank" rel="noreferrer" className="text-brand">receipt</a>}
            <button onClick={async () => { await adminApi.delete(`/api/admin/expenses/${e.id}`); onChange(); }} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonationsList({ project, onChange }: { project: Project; onChange: () => void }) {
  const donations = project.donations ?? [];
  return (
    <div className="card p-5">
      <h3 className="font-display font-bold text-ink">Donations ({donations.length})</h3>
      <div className="mt-3 divide-y divide-border">
        {donations.length === 0 && <p className="text-sm text-muted">No donations yet.</p>}
        {donations.map((d: ProjectDonation, i) => (
          <div key={i} className="flex items-center justify-between py-2 text-sm">
            <span className="text-ink">{d.donorName} {d.anonymous && <span className="text-xs text-muted">(anon)</span>}</span>
            <span className="font-semibold text-brand">{currency(d.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
