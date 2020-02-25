export function mapRecord<T>(
    obj: Record<string, T>,
    replaceFn: (key: string, currentValue: T) => T,
    targetObj: Record<string, T> = {}
) {
    for (const [key, value] of Object.entries(obj)) {
        targetObj[key] = replaceFn(key, value);
    }
    return targetObj;
}
