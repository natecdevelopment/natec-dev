// Silhouette icons used on the directors' cards instead of name initials.
export function PersonMaleIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <circle cx="12" cy="5.6" r="3.1" />
      <path d="M12 10.2c-4.1 0-7.4 2.3-7.4 5.2v5.6c0 .55.45 1 1 1h12.8c.55 0 1-.45 1-1v-5.6c0-2.9-3.3-5.2-7.4-5.2Z" />
    </svg>
  );
}

export function PersonFemaleIcon({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <circle cx="12" cy="1.8" r="1.25" />
      <circle cx="12" cy="5.6" r="3.1" />
      <path d="M9.3 10.3h5.4l3.2 10.6c.15.5-.23 1-.76 1H6.86c-.53 0-.91-.5-.76-1L9.3 10.3Z" />
    </svg>
  );
}
