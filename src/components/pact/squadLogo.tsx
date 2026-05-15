import sq1Logo from "../../assets/squads/sq1.png";
import sq2Logo from "../../assets/squads/sq2.png";
import sq3Logo from "../../assets/squads/sq3.png";
import sq4Logo from "../../assets/squads/sq4.png";
import type { SquadNumber } from "../../types";

const squadLogos: Record<SquadNumber, string> = {
  "1": sq1Logo,
  "2": sq2Logo,
  "3": sq3Logo,
  "4": sq4Logo
};

export function squadLogoFor(squadNumber?: SquadNumber) {
  return squadNumber ? squadLogos[squadNumber] : undefined;
}

export function SquadLogo({
  squadNumber,
  className = "",
  decorative = false
}: {
  squadNumber?: SquadNumber;
  className?: string;
  decorative?: boolean;
}) {
  const logo = squadLogoFor(squadNumber);
  if (!logo || !squadNumber) return null;

  return (
    <img
      alt={decorative ? "" : `Squad ${squadNumber} logo`}
      aria-hidden={decorative ? "true" : undefined}
      className={`squad-logo squad-logo-${squadNumber} ${className}`.trim()}
      decoding="async"
      loading="lazy"
      src={logo}
    />
  );
}
