// Fine-line portrait marks used on the directors' cards instead of name initials.
// Male and female variants are drawn in the same hand-drawn line style as the
// architectural sketch on the home page.

type IconProps = { className?: string };

const lineProps = {
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function PersonMaleIcon({ className = "h-10 w-10" }: IconProps) {
  return (
    <svg {...lineProps} className={className}>
      {/* head */}
      <ellipse cx="24" cy="18" rx="6.6" ry="7.4" />
      {/* hairline */}
      <path d="M18.1 15.8c.5-3.8 3.1-5.9 5.9-5.9s5.4 2.1 5.9 5.9" />
      {/* side parting */}
      <path d="M21.6 10.9c2.1 1.1 3.7 2.7 4.8 4.7" opacity=".7" />
      {/* neck */}
      <path d="M21.4 25v6.4M26.6 25v6.4" />
      {/* shoulders */}
      <path d="M10.6 39.6c.4-5.2 6-8.2 13.4-8.2s13 3 13.4 8.2" />
      {/* shirt collar */}
      <path d="M24 31.6l-3.4 3.6M24 31.6l3.4 3.6" />
    </svg>
  );
}

export function PersonFemaleIcon({ className = "h-10 w-10" }: IconProps) {
  return (
    <svg {...lineProps} className={className}>
      {/* head */}
      <ellipse cx="24" cy="18" rx="6.2" ry="7" />
      {/* hair framing the face */}
      <path d="M17.2 24.8C15.2 20.4 15.2 12.2 19.2 9.4c2.8-2 6.8-2 9.6 0 4 2.8 4 11 2 15.4" />
      {/* low bun */}
      <circle cx="32.8" cy="22.4" r="2.6" />
      {/* earring */}
      <circle cx="18.2" cy="23" r="1.1" fill="currentColor" stroke="none" />
      {/* neck */}
      <path d="M21.6 24.8v6.6M26.4 24.8v6.6" />
      {/* shoulders */}
      <path d="M11 39.6c.4-5.2 5.8-8.2 13-8.2s12.6 3 13 8.2" />
      {/* scoop neckline */}
      <path d="M19.4 32.2c1.4 2.8 8.2 2.8 9.6 0" />
    </svg>
  );
}
