export function VintageKeyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="5.6" cy="8" r="4.3" />
      <circle cx="5.6" cy="8" r="1.6" />
      <path d="M9.9 8h19.5" />
      <path d="M11.4 5.4v5.2" />
      <path d="M22.6 8v4.4" />
      <path d="M26.2 8v3" />
    </svg>
  );
}
