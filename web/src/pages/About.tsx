import { Link } from "react-router-dom";
import { useContent } from "../context/ContentContext";

const FUTURE = [
  "Online ordering", "Table reservations", "Hotel booking", "Appointment booking",
  "Delivery system", "Online payments", "Loyalty & rewards", "Gift cards",
  "Job board", "Classified ads", "AI assistant", "Municipality announcements",
  "Tourism guides", "Multi-city support",
];

export function About() {
  const c = useContent();
  return (
    <div>
      {/* Story hero */}
      <section className="relative isolate overflow-hidden">
        <img src={c.about.image} alt="Aley" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 to-black/80" />
        <div className="mx-auto max-w-3xl px-4 py-24 text-center text-white">
          <h1 className="font-display text-4xl font-extrabold drop-shadow sm:text-5xl">{c.about.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-lg text-white/90">{c.about.body}</p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Discover", d: "Search and explore every business, place, and event in the city." },
            { n: "2", t: "Support", d: "Back local businesses and fund community projects, transparently." },
            { n: "3", t: "Experience", d: "Offers, reviews, and hidden gems bring Aley to life." },
          ].map((s) => (
            <div key={s.n} className="card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white">{s.n}</span>
              <p className="mt-3 font-display font-bold text-ink">{s.t}</p>
              <p className="mt-1 text-sm text-muted">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="card mt-8 flex flex-col items-start gap-3 bg-gradient-to-r from-brand to-brand-dark p-8 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-xl font-extrabold">Love your town?</h3>
            <p className="text-white/85">Support and shape the projects making Aley better.</p>
          </div>
          <Link to="/projects" className="btn bg-white px-6 py-2.5 text-brand-dark">Love Aley ❤</Link>
        </div>

        <h2 className="mt-12 font-display text-2xl font-extrabold text-ink">Built to grow</h2>
        <p className="mt-2 text-muted">
          The platform is architected to expand from Aley to Beirut, Byblos, Batroun, Zahle, Sidon and beyond — one system, many cities.
          These features are on the roadmap:
        </p>
        <div className="mt-4 flex flex-wrap gap-2">{FUTURE.map((f) => <span key={f} className="chip">{f}</span>)}</div>

        <div className="card mt-12 flex flex-col items-start gap-3 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-xl font-extrabold text-ink">Own a business in Aley?</h3>
            <p className="text-muted">Get your own page, publish offers and events, and reach the whole city.</p>
          </div>
          <Link to="/owner/login" className="btn btn-primary px-6 py-2.5">List your business</Link>
        </div>
      </div>
    </div>
  );
}
