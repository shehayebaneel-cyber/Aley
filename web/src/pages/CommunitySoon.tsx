import { useEffect } from "react";
import { Link } from "react-router-dom";
import { HandHeartIcon } from "../components/icons";
import { COMMUNITY_URL } from "../lib/config";
import { useTitle } from "../lib/useTitle";

// Placeholder for the future dedicated, non-profit "Improve Aley" platform.
// If COMMUNITY_URL is set, we redirect straight to it.
export function CommunitySoon() {
  useTitle("Community Projects");
  useEffect(() => {
    if (COMMUNITY_URL) window.location.replace(COMMUNITY_URL);
  }, []);

  if (COMMUNITY_URL) {
    return <div className="mx-auto max-w-md px-4 py-24 text-center text-muted">Taking you to Community…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
        <HandHeartIcon className="h-8 w-8" />
      </span>
      <h1 className="mt-5 font-display text-4xl font-extrabold text-ink">Community Projects</h1>
      <p className="mx-auto mt-3 max-w-xl text-lg text-muted">
        A dedicated community platform is on the way — community projects, transparent fundraising,
        volunteering, and reporting local issues in every city across Lebanon, all in one place.
      </p>
      <p className="mx-auto mt-3 max-w-xl text-muted">
        Each city will have its own projects and initiatives — browse them all, or filter by city. We'll
        open it up the moment it launches.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn btn-primary px-6 py-3">Back to home</Link>
        <Link to="/contact" className="btn btn-ghost px-6 py-3">Get involved / contact us</Link>
      </div>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Coming soon 🌱</p>
    </div>
  );
}
