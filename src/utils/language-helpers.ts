export const noop = (): void => undefined;
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isPlainObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function mapRecord<T>(
  obj: Record<string, T>,
  replaceFn: (key: string, currentValue: T) => T,
  targetObj: Record<string, T> = {},
  onReplace: (key: string, originalValue: T, newValue: T) => void = noop
): Record<string, T> {
  for (const [key, value] of Object.entries(obj)) {
    const newValue = replaceFn(key, value);
    if (newValue !== value) {
      onReplace(key, value, newValue);
    }
    targetObj[key] = newValue;
  }
  return targetObj;
}

export function flattenTree<T>(
  root: T,
  children: (node: T) => Iterable<T>,
  predicate: (node: T) => boolean = (): boolean => true
): Set<T> {
  const results = new Set<T>();
  const visited = new Set<T>();
  const toProcess = [root];
  while (toProcess.length) {
    const node = toProcess.shift()!;
    if (visited.has(node)) {
      continue;
    }
    visited.add(node);
    if (predicate(node)) {
      results.add(node);
    }
    toProcess.push(...children(node));
  }
  return results;
}

export function* concatIterables<T>(...iterables: Iterable<T>[]): Iterable<T> {
  for (const iterable of iterables) {
    for (const item of iterable) {
      yield item;
    }
  }
}
