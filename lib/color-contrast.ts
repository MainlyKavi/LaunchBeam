type Rgb = readonly [number, number, number];

const SAFE_OPAQUE_HEX_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{6})$/i;
const SAFE_PERSISTED_HEX_PATTERN =
  /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;

export function isSafeOpaqueHexColor(value: string): boolean {
  return SAFE_OPAQUE_HEX_PATTERN.test(value);
}

export function isSafePersistedHexColor(value: string): boolean {
  return SAFE_PERSISTED_HEX_PATTERN.test(value);
}

function parseOpaqueHex(value: string): Rgb | null {
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value);
  if (!match) return null;
  const expanded =
    match[1].length === 3
      ? [...match[1]].map((character) => character.repeat(2)).join("")
      : match[1];
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function relativeLuminance(rgb: Rgb): number {
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(left: string, right: string): number | null {
  const leftRgb = parseOpaqueHex(left);
  const rightRgb = parseOpaqueHex(right);
  if (!leftRgb || !rightRgb) return null;
  const leftLuminance = relativeLuminance(leftRgb);
  const rightLuminance = relativeLuminance(rightRgb);
  return (
    (Math.max(leftLuminance, rightLuminance) + 0.05) /
    (Math.min(leftLuminance, rightLuminance) + 0.05)
  );
}

export function readableTextColor(background: string): "#000000" | "#ffffff" {
  const blackContrast = contrastRatio(background, "#000000") ?? 0;
  const whiteContrast = contrastRatio(background, "#ffffff") ?? 0;
  return blackContrast >= whiteContrast ? "#000000" : "#ffffff";
}
