// Illustrated line-art portraits used on the directors' cards instead of name
// initials. Drawn in the same fine-line editorial style as the home-page sketch.
import portraitMale from "@/assets/portrait-male.png";
import portraitFemale from "@/assets/portrait-female.png";

type IconProps = { className?: string };

export function PersonMaleIcon({ className = "h-12 w-12" }: IconProps) {
  return (
    <img
      src={portraitMale}
      alt=""
      aria-hidden
      loading="eager"
      width={512}
      height={512}
      className={className}
    />
  );
}

export function PersonFemaleIcon({ className = "h-12 w-12" }: IconProps) {
  return (
    <img
      src={portraitFemale}
      alt=""
      aria-hidden
      loading="eager"
      width={512}
      height={512}
      className={className}
    />
  );
}
