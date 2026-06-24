import { FormEvent, useState } from "react";
import { CheckIcon, InstagramIcon, MapPinIcon, PhoneIcon } from "../components/icons";
import { useContent } from "../context/ContentContext";

export function Contact() {
  const { contact } = useContent();
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    // Phase 1: front-end only confirmation. A /api/contact endpoint comes with the admin phase.
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-4xl font-extrabold text-ink">Get in touch</h1>
      <p className="mt-2 text-muted">Questions, partnerships, or want to list your business? We'd love to hear from you.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <form onSubmit={submit} className="card space-y-4 p-6">
          {sent ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 font-semibold text-emerald-600">
              <CheckIcon className="h-5 w-5" /> Thanks! We'll get back to you soon.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink">Name<input required className="input mt-1" /></label>
                <label className="text-sm font-semibold text-ink">Email<input type="email" required className="input mt-1" /></label>
              </div>
              <label className="block text-sm font-semibold text-ink">Subject<input className="input mt-1" /></label>
              <label className="block text-sm font-semibold text-ink">Message<textarea rows={5} required className="input mt-1" /></label>
              <button type="submit" className="btn btn-primary px-6 py-3">Send message</button>
            </>
          )}
        </form>

        <aside className="space-y-3">
          <div className="card p-5">
            <h2 className="font-display font-bold text-ink">Reach us</h2>
            <ul className="mt-3 space-y-2.5 text-sm text-muted">
              {contact.address && <li className="flex items-center gap-2"><MapPinIcon className="h-4 w-4 text-brand" /> {contact.address}</li>}
              {contact.phone && <li className="flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-brand" /> {contact.phone}</li>}
              {contact.instagram && <li className="flex items-center gap-2"><InstagramIcon className="h-4 w-4 text-brand" /> @{contact.instagram}</li>}
            </ul>
          </div>
          <div className="card bg-brand-soft p-5">
            <p className="font-display font-bold text-brand-dark">List your business</p>
            <p className="mt-1 text-sm text-brand-dark/80">Business dashboards are coming next — leave your details and we'll set you up.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
