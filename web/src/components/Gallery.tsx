import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "./icons";
import type { GalleryImage } from "../types";

/** Compact, horizontally-scrollable gallery with a fullscreen lightbox. */
export function Gallery({ images }: { images: GalleryImage[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  // Pointer drag-to-scroll (desktop). Native scroll/touch-swipe work for free.
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });

  const onPointerDown = (e: React.PointerEvent) => {
    const el = scroller.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scroller.current;
    if (!el || !drag.current.down) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => { drag.current.down = false; };

  const scrollBy = (dir: -1 | 1) => scroller.current?.scrollBy({ left: dir * Math.round((scroller.current.clientWidth || 300) * 0.8), behavior: "smooth" });

  if (!images.length) return null;

  return (
    <section className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Gallery</h2>
        <div className="hidden gap-1.5 sm:flex">
          <button onClick={() => scrollBy(-1)} aria-label="Scroll left" className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink transition hover:bg-surface-2">‹</button>
          <button onClick={() => scrollBy(1)} aria-label="Scroll right" className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink transition hover:bg-surface-2">›</button>
        </div>
      </div>

      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:thin] cursor-grab active:cursor-grabbing select-none"
      >
        {images.map((img, i) => (
          <figure key={i} className="relative h-56 w-72 shrink-0 snap-start overflow-hidden rounded-xl sm:h-60 sm:w-80">
            <img
              src={img.url}
              alt={img.caption ?? ""}
              loading="lazy"
              draggable={false}
              onClick={() => { if (!drag.current.moved) setOpen(i); }}
              className="h-full w-full cursor-zoom-in object-cover transition hover:scale-[1.03]"
            />
            {img.caption && (
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-xs font-medium text-white">{img.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>

      {open !== null && <Lightbox images={images} index={open} setIndex={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Lightbox({ images, index, setIndex, onClose }: { images: GalleryImage[]; index: number; setIndex: (i: number) => void; onClose: () => void }) {
  const [zoom, setZoom] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panning = useRef<{ x: number; y: number } | null>(null);

  const go = (dir: -1 | 1) => { setZoom(false); setPan({ x: 0, y: 0 }); setIndex((index + dir + images.length) % images.length); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const img = images[index];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-semibold opacity-80">{index + 1} / {images.length}</span>
        <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><CloseIcon className="h-5 w-5" /></button>
      </div>

      {/* Image stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2" onClick={(e) => e.stopPropagation()}>
        {images.length > 1 && (
          <button onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:left-6">‹</button>
        )}
        <img
          src={img.url}
          alt={img.caption ?? ""}
          draggable={false}
          onClick={() => { setZoom((z) => !z); setPan({ x: 0, y: 0 }); }}
          onPointerDown={(e) => { if (zoom) panning.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }}
          onPointerMove={(e) => { if (zoom && panning.current) setPan({ x: e.clientX - panning.current.x, y: e.clientY - panning.current.y }); }}
          onPointerUp={() => (panning.current = null)}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom ? 2.4 : 1})` }}
          className={`max-h-full max-w-full select-none rounded-lg object-contain transition-transform duration-200 ${zoom ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        />
        {images.length > 1 && (
          <button onClick={() => go(1)} aria-label="Next" className="absolute right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20 sm:right-6">›</button>
        )}
      </div>

      {/* Caption */}
      {img.caption && <p className="p-4 text-center text-sm text-white/90" onClick={(e) => e.stopPropagation()}>{img.caption}</p>}
    </div>
  );
}
