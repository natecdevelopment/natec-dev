import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { MediaRow } from "@/lib/projects-data";

/** Full-screen gallery viewer: arrows, keyboard (←/→/Esc), touch swipe, alt-text captions. */
export function Lightbox({ items, index, onIndex, onClose, label }: { items: MediaRow[]; index: number; onIndex: (i: number) => void; onClose: () => void; label: string }) {
  const startX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const n = items.length;
  const go = (d: number) => onIndex((index + d + n) % n);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  });

  const m = items[index];
  if (!m) return null;
  const caption = m.caption || m.alt_text || `${label} — photo ${index + 1}`;
  return (
    <div data-lenis-prevent role="dialog" aria-modal="true" aria-label={`${label} gallery`} className="fixed inset-0 z-[100] flex flex-col bg-navy-deep/95 text-white"
      onTouchStart={(e) => { startX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? 0) - startX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        startX.current = null;
      }}>
      <div className="flex items-center justify-between px-5 py-4">
        <span className="eyebrow !text-[11px] text-white/70">{index + 1} / {n}</span>
        <button ref={closeRef} onClick={onClose} aria-label="Close gallery" className="rounded-full p-2 hover:bg-white/10"><X className="h-6 w-6" /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <img src={m.public_url} alt={m.alt_text || caption} className="max-h-full max-w-full select-none rounded-lg object-contain" draggable={false} />
        {n > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20 md:left-6"><ChevronLeft className="h-6 w-6" /></button>
            <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 hover:bg-white/20 md:right-6"><ChevronRight className="h-6 w-6" /></button>
          </>
        )}
      </div>
      <p className="px-5 py-5 text-center text-sm text-white/80" aria-live="polite">{caption}</p>
    </div>
  );
}
