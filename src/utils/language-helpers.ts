export const noop = (): void => undefined;

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
