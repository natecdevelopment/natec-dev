import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Floating-label input with a red underline that grows from the left and a one-time shake on error. */
export function Field({ label, name, type = "text", error, shakeKey, autoComplete, inputMode, defaultValue, onChange, children, password, placeholder, value }: {
  label: string; name: string; type?: string | undefined; error?: string | undefined; shakeKey?: number | undefined; autoComplete?: string | undefined; inputMode?: "tel" | "email" | "text" | undefined;
  defaultValue?: string | undefined; onChange?: ((v: string) => void) | undefined; children?: React.ReactNode; password?: boolean | undefined; placeholder?: string | undefined; value?: string | undefined;
}) {
  const id = useId();
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);
  const t = password ? (show ? "text" : "password") : type;
  return (
    <motion.div
      key={error ? `e${shakeKey}` : "ok"}
      animate={error && !reduce ? { x: [0, -8, 7, -5, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative">
        <input
          id={id} name={name} type={t} placeholder={placeholder || " "} autoComplete={autoComplete} inputMode={inputMode} {...(value !== undefined ? { value } : { defaultValue })}
          onChange={(e) => onChange?.(e.target.value)}
          aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
          className={`peer block h-14 w-full rounded-t-lg border-0 border-b bg-ivory/60 px-4 pb-2 pt-6 text-[15px] text-navy outline-none placeholder:text-transparent focus:placeholder:text-navy/40 transition ${password ? "pr-12" : ""} ${error ? "border-brand-red" : "border-navy/25"}`}
        />
        <label htmlFor={id} className="pointer-events-none absolute left-4 top-4 origin-left text-[15px] text-navy/60 transition-all duration-200 peer-focus:top-2 peer-focus:text-[11px] peer-focus:tracking-wide peer-focus:text-brand-red peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px]">
          {label}
        </label>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-brand-red transition-transform duration-300 peer-focus:scale-x-100" />
        {password && (
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-navy/60 hover:text-navy">
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {children}
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-brand-red">{error}</p>}
    </motion.div>
  );
}

export type SubmitState = "idle" | "loading" | "success";
export function SubmitButton({ state, children }: { state: SubmitState; children: React.ReactNode }) {
  return (
    <button disabled={state !== "idle"} className="btn btn-primary relative h-14 w-full overflow-hidden text-[15px] disabled:cursor-default">
      {state === "idle" && children}
      {state === "loading" && <Loader2 className="h-5 w-5 animate-spin" aria-label="Please wait" />}
      {state === "success" && (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-label="Done">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: EASE }} />
        </svg>
      )}
    </button>
  );
}

/** Thin card shell used by forgot/reset pages. */
export function AuthCard({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-[80vh] items-center justify-center bg-ivory px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-navy px-8 py-6 text-white">
          <img src="/brand/natec-logo-transparent.png" alt="Natec Development Ltd." width={60} height={72} className="h-14 w-auto rounded bg-white/95 p-1" />
          <h1 className="mt-4 !text-3xl">{title}</h1>
          {intro && <p className="mt-1 text-sm text-white/75">{intro}</p>}
        </div>
        <div className="p-8">{children}</div>
      </motion.div>
    </section>
  );
}
