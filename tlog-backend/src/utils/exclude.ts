/**
 * Helper function to exclude specified keys from an object
 * Useful for quick responses without creating full DTOs
 */
export function exclude<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}
