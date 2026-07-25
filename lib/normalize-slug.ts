export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function hasValidSlugShape(value: string): boolean {
  return (
    value.length >= 3 &&
    value.length <= 40 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}
