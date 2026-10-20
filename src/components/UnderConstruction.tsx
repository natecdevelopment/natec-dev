import { Link } from "@tanstack/react-router";

export function UnderConstruction({ title }: { title: string }) {
  return (
    <section className="bg-ink text-ink-foreground">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-24 text-center">
        <div className="mb-8 h-3 w-40 bg-[repeating-linear-gradient(45deg,var(--caution)_0_12px,var(--ink)_12px_24px)]" />
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-caution">{title}</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-6xl">Under construction</h1>
        <p className="mt-4 max-w-md opacity-70">
          We're building this page with the same care we put into our homes. Please check back soon.
        </p>
        <Link to="/" className="mt-8 bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground">Back to home</Link>
      </div>
    </section>
  );
}
