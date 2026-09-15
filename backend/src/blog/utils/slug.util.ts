export function slugifyTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function generateUniqueSlug(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
  excludeId?: string,
): Promise<string> {
  const base = slugifyTitle(title) || 'post';
  let candidate = base;
  let counter = 2;

  while (await isTaken(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  if (excludeId) {
    return candidate;
  }

  return candidate;
}
