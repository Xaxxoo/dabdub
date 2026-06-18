import slugify from 'slugify';

export function generateSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    trim: true,
  });
}

/**
 * Generates a unique slug by appending a numeric suffix if the base slug conflicts.
 * @param text      - the source text to slugify
 * @param isConflict - async predicate that returns true if the candidate slug is taken
 */
export async function generateUniqueSlug(
  text: string,
  isConflict: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = generateSlug(text);
  let candidate = base;
  let counter = 0;

  while (await isConflict(candidate)) {
    counter++;
    candidate = `${base}-${counter}`;
  }

  return candidate;
}
