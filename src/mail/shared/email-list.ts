export function parseEmailList(value?: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}
