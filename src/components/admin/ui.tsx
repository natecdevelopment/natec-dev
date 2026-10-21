import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="!text-3xl text-navy md:!text-4xl">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-card p-5 shadow-sm ring-1 ring-navy/5 ${className}`}>{children}</div>;
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return <div className="space-y-3">{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Card className="py-12 text-center">
      <p className="font-display text-xl text-navy">{title}</p>
      <div className="mt-4 flex justify-center gap-2">{children}</div>
    </Card>
  );
}

/** Confirm dialog wrapper: render-prop gives an `ask()` to open it. */
export function Confirm({ title, description, confirmLabel = "Delete", onConfirm, children }: { title: string; description: string; confirmLabel?: string; onConfirm: () => void | Promise<void>; children: (ask: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children(() => setOpen(true))}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-brand-red hover:bg-brand-red/90" onClick={() => onConfirm()}>{confirmLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function move<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it as T);
  return next;
}

/** Drag-and-drop list with up/down buttons for keyboard and phones. */
export function SortableList<T>({ items, getId, onReorder, render, className = "space-y-3" }: { items: T[]; getId: (t: T) => string; onReorder: (next: T[]) => void; render: (item: T, index: number) => ReactNode; className?: string }) {
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  return (
    <ul className={className}>
      {items.map((item, i) => (
        <li
          key={getId(item)}
          draggable
          onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; }}
          onDragOver={(e) => { e.preventDefault(); setOver(i); }}
          onDragEnd={() => { setDrag(null); setOver(null); }}
          onDrop={(e) => { e.preventDefault(); if (drag !== null && drag !== i) onReorder(move(items, drag, i)); setDrag(null); setOver(null); }}
          className={`flex items-center gap-2 rounded-2xl bg-card p-3 shadow-sm ring-1 transition ${over === i && drag !== i ? "ring-2 ring-brand-red" : "ring-navy/5"} ${drag === i ? "opacity-50" : ""}`}
        >
          <GripVertical className="hidden h-5 w-5 shrink-0 cursor-grab text-navy/40 sm:block" aria-hidden />
          <div className="min-w-0 flex-1">{render(item, i)}</div>
          <div className="flex shrink-0 flex-col">
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => onReorder(move(items, i, i - 1))} className="rounded p-1 text-navy hover:bg-navy/5 disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => onReorder(move(items, i, i + 1))} className="rounded p-1 text-navy hover:bg-navy/5 disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export const btnSm = "inline-flex items-center gap-1.5 rounded-full border border-navy/20 px-3 py-1.5 text-xs font-medium text-navy transition hover:bg-navy/5";
export const btnDanger = "inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 px-3 py-1.5 text-xs font-medium text-brand-red transition hover:bg-brand-red/5";
