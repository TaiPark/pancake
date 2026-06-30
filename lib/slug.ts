export function slugify(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "group";
}

export function makeInviteCode(seed = crypto.randomUUID()) {
  return seed.replace(/-/g, "").slice(0, 8).toUpperCase();
}
