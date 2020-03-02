export const isString = (value: unknown): value is string => typeof value === 'string';
export const isObject = (value: unknown): value is object => typeof value === 'object' && value !== null;

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

export function flattenTree<T>(
    root: T,
    children: (node: T) => Iterable<T>,
    predicate: (node: T) => boolean = () => true
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
