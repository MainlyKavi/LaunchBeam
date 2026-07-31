import Image from "next/image";

type LaunchBeamLogoProps = {
  className?: string;
  compact?: boolean;
  iconOnly?: boolean;
  inverse?: boolean;
};

export function LaunchBeamLogo({
  className = "",
  compact = false,
  iconOnly = false,
  inverse = false,
}: LaunchBeamLogoProps) {
  const classes = [
    "launchbeam-logo",
    compact ? "launchbeam-logo--compact" : "",
    iconOnly ? "launchbeam-logo--icon-only" : "",
    inverse ? "launchbeam-logo--inverse" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <Image
        className="launchbeam-logo__icon"
        src="/launchbeam-icon.png"
        alt=""
        width={44}
        height={44}
        sizes="44px"
      />
      {iconOnly ? null : (
        <span className="launchbeam-logo__wordmark">
          <span className="launchbeam-logo__launch">Launch</span>
          <span className="launchbeam-logo__beam">Beam</span>
        </span>
      )}
    </span>
  );
}
