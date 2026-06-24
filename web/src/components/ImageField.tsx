import { useRef, useState } from "react";
import { ownerApi } from "../lib/api";

type Uploader = { post: <T>(path: string, body: unknown) => Promise<T> };

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.readAsDataURL(file);
  });
}

/** Upload an image (or paste a URL). Stores the resulting URL via onChange. */
export function ImageField({
  value,
  onChange,
  aspect = "aspect-video",
  label = "image",
  uploadWith = ownerApi,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: string;
  label?: string;
  uploadWith?: Uploader;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    setBusy(true);
    setError("");
    try {
      const { url } = await uploadWith.post<{ url: string }>("/api/uploads", { dataUrl: await readDataUrl(file) });
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className={`group relative ${aspect} w-full overflow-hidden rounded-xl border border-dashed border-border surface-2 transition hover:border-brand`}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm text-muted">{busy ? "Uploading…" : `Upload ${label}`}</span>
        )}
        {value && (
          <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-sm font-semibold text-white group-hover:flex">
            {busy ? "Uploading…" : "Change"}
          </span>
        )}
      </button>
      <div className="mt-2 flex gap-2">
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="…or paste an image URL"
          className="input !py-2 text-sm"
        />
        {value && (
          <button type="button" onClick={() => onChange(null)} className="btn btn-ghost shrink-0 px-3 py-2 text-sm">Remove</button>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-500">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
