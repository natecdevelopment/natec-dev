import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

// True only when the site is open inside the Lovable editor (preview iframe on lovable.dev).
function isInLovableEditor() {
  if (window.self === window.top) return false;
  const origins = Array.from(window.location.ancestorOrigins ?? []);
  return [...origins, document.referrer].some((o) => /(^|\.|\/\/)lovable\.dev/.test(o));
}

export function UnderConstruction({ title, real: Real }: { title: string; real?: React.ComponentType }) {
  const [editor, setEditor] = useState(false);
  useEffect(() => setEditor(isInLovableEditor()), []);
  if (editor && Real) return <Real />;
  return (
    <section className="bg-navy-deep text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-24 text-center">
        <div className="mb-8 h-3 w-40 bg-[repeating-linear-gradient(45deg,var(--red)_0_12px,var(--navy-deep)_12px_24px)]" />
        <p className="eyebrow text-muted-dark">{title}</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-6xl">Under construction</h1>
        <p className="mt-4 max-w-md text-muted-dark">
          We're building this page with the same care we put into our homes. Please check back soon.
        </p>
        <Link to="/" className="btn btn-primary mt-8">Back to home</Link>
      </div>
    </section>
  );
}
