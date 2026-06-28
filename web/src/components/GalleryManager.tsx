import { useRef, useState } from "react";
import { ImageField } from "./ImageField";
import { CheckIcon } from "./icons";
import type { GalleryImage } from "../types";

type Uploader = { post: <T>(path: string, body: unknown) => Promise<T> };

/** Manage a business gallery: upload, delete, drag-reorder, set cover, captions. */
export function GalleryManager({
  value, onChange, cover, onCoverChange, uploader,
}: {
  value: GalleryImage[];
  onChange: (next: GalleryImage[]) => void;
  cover: string | null;
  onCoverChange: (url: string) => void;
  uploader: Uploader;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const overIndex = useRef<number | null>(null);

  const setCaption = (i: number, caption: string) => onChange(value.map((g, j) => (j === i ? { ...g, caption: caption || undefined } : g)));
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = value.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div>
      <p className="text-sm text-muted">Drag photos to reorder. The first photo leads the gallery. Set any photo as your cover, and add optional captions.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {value.map((img, i) => {
          const isCover = !!cover && img.url === cover;
          return (
            <div
              key={i}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => { e.preventDefault(); overIndex.current = i; }}
              onDrop={() => { if (dragIndex !== null) reorder(dragIndex, i); setDragIndex(null); }}
              onDragEnd={() => setDragIndex(null)}
              className={`group rounded-xl border bg-surface p-1.5 transition ${dragIndex === i ? "opacity-40" : "opacity-100"} ${isCover ? "border-brand ring-1 ring-brand" : "border-border"}`}
            >
              <div className="relative cursor-move overflow-hidden rounded-lg">
                <img src={img.url} alt="" className="aspect-square w-full object-cover" draggable={false} />
                {isCover && <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">Cover</span>}
                <button onClick={() => remove(i)} className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-500" title="Delete">✕</button>
              </div>
              <input
                value={img.caption ?? ""}
                onChange={(e) => setCaption(i, e.target.value)}
                placeholder="Caption (optional)"
                className="mt-1.5 w-full rounded-md border border-border bg-surface px-2 py-1 text-xs"
              />
              <button
                onClick={() => onCoverChange(img.url)}
                disabled={isCover}
                className="mt-1 flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft disabled:text-muted disabled:hover:bg-transparent"
              >
                {isCover ? <><CheckIcon className="h-3.5 w-3.5" /> Cover</> : "Set as cover"}
              </button>
            </div>
          );
        })}
        <div className="aspect-square self-start">
          <ImageField value={null} uploadWith={uploader} onChange={(url) => url && onChange([...value, { url }])} aspect="aspect-square" label="photo" />
        </div>
      </div>
      {value.length === 0 && <p className="mt-2 text-xs text-muted">No photos yet — upload your first above.</p>}
      <p className="mt-3 text-xs text-muted">Coming soon: videos, 360° photos and virtual tours.</p>
    </div>
  );
}
