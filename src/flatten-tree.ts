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
