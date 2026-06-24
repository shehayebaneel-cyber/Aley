import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProgressBar } from "../components/ProjectCard";
import { CheckIcon, CloseIcon, HandHeartIcon, HeartIcon, MapPinIcon, StarIcon, UsersIcon } from "../components/icons";
import { useUserAuth } from "../context/UserAuthContext";
import { api, currency, PROJECT_STATUS, timeAgo, userApi } from "../lib/api";
import { mapsLinkFromCoords } from "../lib/maps";
import type { Project } from "../types";

export function ProjectDetail() {
  const { slug } = useParams();
  const { user, openAuth } = useUserAuth();
  const [p, setP] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [donateOpen, setDonateOpen] = useState(false);
  const [tab, setTab] = useState<"about" | "updates" | "transparency" | "comments">("about");

  const load = () => api.get<Project>(`/api/projects/${slug}`).then(setP).catch((e) => setError(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-24 text-center"><p className="text-lg font-semibold text-ink">Project not found.</p><Link to="/projects" className="mt-3 inline-block font-semibold text-brand">← All projects</Link></div>;
  if (!p) return <div className="mx-auto max-w-5xl px-4 py-16"><div className="card h-96 animate-pulse" /></div>;

  const st = PROJECT_STATUS[p.status];
  const cover = p.proposedPhotos[0] ?? p.progressPhotos[0] ?? p.beforePhotos[0] ?? null;

  async function vote() {
    if (!user) return openAuth();
    const res = await userApi.post<{ voted: boolean; voteCount: number }>(`/api/projects/${p!.id}/vote`, {});
    setP({ ...p!, hasVoted: res.voted, voteCount: res.voteCount });
  }
  async function follow() {
    if (!user) return openAuth();
    const res = await userApi.post<{ following: boolean; followerCount: number }>(`/api/projects/${p!.id}/follow`, {});
    setP({ ...p!, isFollowing: res.following, followerCount: res.followerCount });
  }

  return (
    <div>
      <div className="relative h-56 w-full overflow-hidden bg-surface-2 sm:h-80">
        {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-5xl px-4 pb-5 text-white">
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{p.title}</h1>
          <p className="mt-1 flex items-center gap-2 text-white/85">{p.type && <span>{p.type}</span>}{p.location && <span className="flex items-center gap-1"><MapPinIcon className="h-4 w-4" /> {p.location}</span>}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main */}
          <div className="space-y-6 lg:col-span-2">
            <div className="flex gap-1 overflow-x-auto border-b border-border">
              {(["about", "updates", "transparency", "comments"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition ${tab === t ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"}`}>
                  {t === "updates" ? `Updates (${p.updates?.length ?? 0})` : t === "comments" ? `Q&A (${p.comments?.length ?? 0})` : t}
                </button>
              ))}
            </div>

            {tab === "about" && (
              <div className="space-y-6">
                <section className="card p-5">
                  <p className="whitespace-pre-line leading-relaxed text-muted">{p.description}</p>
                  {p.manager && <p className="mt-4 text-sm text-muted">👤 Managed by <span className="font-semibold text-ink">{p.manager}</span></p>}
                  {p.lat && p.lng && <a href={mapsLinkFromCoords(p.lat, p.lng)} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand"><MapPinIcon className="h-4 w-4" /> View location on map</a>}
                </section>

                <PhotoSet title="Before" photos={p.beforePhotos} />
                <PhotoSet title="Proposed design" photos={p.proposedPhotos} />
                <PhotoSet title="Progress" photos={p.progressPhotos} />

                {p.timeline.length > 0 && (
                  <section className="card p-5">
                    <h2 className="font-display text-lg font-bold text-ink">Timeline</h2>
                    <ol className="mt-3 space-y-3">
                      {p.timeline.map((m, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${m.done ? "bg-brand text-white" : "surface-2 text-muted"}`}>{m.done ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}</span>
                          <div><p className={`font-semibold ${m.done ? "text-ink" : "text-muted"}`}>{m.label}</p>{m.date && <p className="text-xs text-muted">{m.date}</p>}</div>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}

                {p.status === "COMPLETED" && p.completedReport && (
                  <section className="card border-emerald-500/30 bg-emerald-500/5 p-5">
                    <h2 className="font-display text-lg font-bold text-emerald-600">✅ Completed project report</h2>
                    <p className="mt-2 whitespace-pre-line text-muted">{p.completedReport}</p>
                    {p.finalCost != null && <p className="mt-2 text-sm font-semibold text-ink">Final cost: {currency(p.finalCost)}</p>}
                  </section>
                )}
              </div>
            )}

            {tab === "updates" && (
              <div className="space-y-4">
                {(p.updates ?? []).length === 0 && <div className="card p-8 text-center text-muted">No updates yet.</div>}
                {(p.updates ?? []).map((u) => (
                  <section key={u.id} className="card p-5">
                    <div className="flex items-center justify-between"><h3 className="font-display font-bold text-ink">{u.title}</h3><span className="text-xs text-muted">{timeAgo(u.createdAt)}</span></div>
                    {u.body && <p className="mt-2 whitespace-pre-line text-muted">{u.body}</p>}
                    {u.images.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{u.images.map((im) => <img key={im} src={im} alt="" className="aspect-square rounded-lg object-cover" />)}</div>}
                  </section>
                ))}
              </div>
            )}

            {tab === "transparency" && (
              <div className="space-y-6">
                <section className="card p-5">
                  <h2 className="font-display text-lg font-bold text-ink">Expense breakdown</h2>
                  {(p.expenses ?? []).length === 0 ? <p className="mt-2 text-sm text-muted">No expenses recorded yet.</p> : (
                    <div className="mt-3 space-y-2">
                      {(p.expenses ?? []).map((e) => (
                        <div key={e.id} className="flex items-center gap-3 rounded-xl surface-2 p-3">
                          <div className="flex-1"><p className="font-semibold text-ink">{e.label}</p>{e.contractor && <p className="text-xs text-muted">{e.contractor}</p>}</div>
                          <span className="font-bold text-ink">{currency(e.amount)}</span>
                          {e.receipt && <a href={e.receipt} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand">Receipt</a>}
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-border px-3 pt-2 text-sm"><span className="font-semibold text-ink">Total spent</span><span className="font-bold text-ink">{currency((p.expenses ?? []).reduce((s, e) => s + e.amount, 0))}</span></div>
                    </div>
                  )}
                </section>
                <section className="card p-5">
                  <h2 className="font-display text-lg font-bold text-ink">Public donation list</h2>
                  <div className="mt-3 divide-y divide-border">
                    {(p.donations ?? []).length === 0 && <p className="text-sm text-muted">Be the first to donate!</p>}
                    {(p.donations ?? []).map((d, i) => (
                      <div key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-ink">{d.donorName}{d.message && <span className="block text-xs text-muted">“{d.message}”</span>}</span>
                        <span className="font-semibold text-brand">{currency(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {tab === "comments" && <Comments project={p} onAdded={load} />}
          </div>

          {/* Sidebar: funding + actions */}
          <aside className="space-y-4">
            <div className="card sticky top-24 p-5">
              <ProgressBar raised={p.amountRaised} goal={p.fundingGoal} />
              <div className="mt-3 flex items-center justify-between text-sm text-muted">
                <span className="inline-flex items-center gap-1"><UsersIcon className="h-4 w-4" /> {p.contributorCount} contributors</span>
                <span>Goal {currency(p.fundingGoal)}</span>
              </div>
              {p.status !== "COMPLETED" && p.status !== "PROPOSED" && (
                <button onClick={() => setDonateOpen(true)} className="btn btn-primary mt-4 w-full py-3"><HandHeartIcon className="h-5 w-5" /> Donate</button>
              )}
              {p.status === "PROPOSED" && <p className="mt-4 rounded-xl surface-2 p-3 text-center text-sm text-muted">This project is awaiting approval before funding opens.</p>}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={vote} className={`btn py-2.5 text-sm ${p.hasVoted ? "btn-primary" : "btn-ghost"}`}><StarIcon className="h-4 w-4" /> {p.voteCount} {p.hasVoted ? "Voted" : "Vote"}</button>
                <button onClick={follow} className={`btn py-2.5 text-sm ${p.isFollowing ? "btn-primary" : "btn-ghost"}`}><HeartIcon filled={p.isFollowing} className="h-4 w-4" /> {p.isFollowing ? "Following" : "Follow"}</button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {donateOpen && <DonateModal project={p} defaultName={user?.name ?? ""} onClose={() => setDonateOpen(false)} onDonated={(updated) => { setP({ ...p, ...updated }); load(); }} />}
    </div>
  );
}

function PhotoSet({ title, photos }: { title: string; photos: string[] }) {
  if (photos.length === 0) return null;
  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((src) => <img key={src} src={src} alt="" loading="lazy" className="aspect-[4/3] rounded-lg object-cover" />)}
      </div>
    </section>
  );
}

function Comments({ project, onAdded }: { project: Project; onAdded: () => void }) {
  const { user } = useUserAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true);
    try {
      await api.post(`/api/projects/${project.id}/comment`, { authorName: name, body });
      setBody("");
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <h2 className="font-display text-lg font-bold text-ink">Questions & comments</h2>
      <form onSubmit={submit} className="mt-3 space-y-2">
        {!user && <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" className="input" />}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Ask a question or leave a comment…" className="input" />
        <button disabled={busy} className="btn btn-primary px-5 py-2 text-sm disabled:opacity-60">Post</button>
      </form>
      <div className="mt-4 divide-y divide-border">
        {(project.comments ?? []).length === 0 && <p className="text-sm text-muted">No comments yet.</p>}
        {(project.comments ?? []).map((c) => (
          <div key={c.id} className="py-3">
            <div className="flex items-center justify-between"><span className="font-semibold text-ink">{c.authorName}</span><span className="text-xs text-muted">{timeAgo(c.createdAt)}</span></div>
            <p className="mt-0.5 text-sm text-muted">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DonateModal({ project, defaultName, onClose, onDonated }: { project: Project; defaultName: string; onClose: () => void; onDonated: (p: Partial<Project>) => void }) {
  const [amount, setAmount] = useState("");
  const [name, setName] = useState(defaultName);
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const presets = [10, 25, 50, 100];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const amt = Number(amount);
    if (!(amt > 0)) return setError("Enter an amount.");
    setBusy(true);
    setError("");
    try {
      const res = await api.post<{ project: Project }>(`/api/projects/${project.id}/donate`, { amount: amt, donorName: name, anonymous, message });
      onDonated(res.project);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="card pop-in w-full max-w-md rounded-b-none p-6 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold text-ink">Support this project</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink"><CloseIcon /></button>
        </div>
        {done ? (
          <div className="mt-5 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"><CheckIcon className="h-7 w-7" /></span>
            <p className="mt-3 font-display text-lg font-bold text-ink">Thank you, {anonymous ? "friend" : name || "friend"}! 💚</p>
            <p className="mt-1 text-muted">Your contribution to Aley has been recorded.</p>
            <button onClick={onClose} className="btn btn-primary mt-5 px-6 py-2.5">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-sm text-muted">{project.title}</p>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((v) => <button key={v} type="button" onClick={() => setAmount(String(v))} className={`chip justify-center ${amount === String(v) ? "chip-active" : ""}`}>${v}</button>)}
            </div>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="Other amount ($)" className="input" />
            {!anonymous && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input" />}
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Message (optional)" className="input" />
            <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-4 w-4" /> Donate anonymously</label>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-medium text-red-500">{error}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3 disabled:opacity-60">{busy ? "Processing…" : `Donate ${amount ? currency(Number(amount) || 0) : ""}`}</button>
            <p className="text-center text-[11px] text-muted">Demo: donations are recorded without a real payment for now.</p>
          </form>
        )}
      </div>
    </div>
  );
}
