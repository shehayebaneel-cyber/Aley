import { useRef, useState } from "react";
import { api } from "../lib/api";

type Uploader = { post: <T>(path: string, body: unknown) => Promise<T> };
const readDataUrl = (file: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("read failed")); r.readAsDataURL(file); });

/** Compact multi-photo picker: thumbnails + a small dashed "add" tile. */
export function PhotoUploader({ photos, onChange, max = 4, uploadWith = api }: { photos: string[]; onChange: (p: string[]) => void; max?: number; uploadWith?: Uploader }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, max - photos.length)) {
      if (!file.type.startsWith("image/")) continue;
      try { const { url } = await uploadWith.post<{ url: string }>("/api/uploads", { dataUrl: await readDataUrl(file) }); urls.push(url); } catch { /* skip */ }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (urls.length) onChange([...photos, ...urls]);
  }

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {photos.map((p, i) => (
        <div key={i} className="relative">
          <img src={p} alt="" className="h-16 w-16 rounded-lg object-cover" />
          <button type="button" onClick={() => onChange(photos.filter((_, j) => j !== i))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">×</button>
        </div>
      ))}
      {photos.length < max && (
        <button type="button" onClick={() => fileRef.current?.click()} className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border surface-2 text-muted transition hover:border-brand hover:text-brand">
          <span className="text-lg leading-none">{busy ? "…" : "＋"}</span>
          <span className="text-[10px]">{busy ? "" : "Photo"}</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}
