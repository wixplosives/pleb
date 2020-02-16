export function parseIni(fileContents: string): Record<string, string> {
    const config: Record<string, string> = {};
    for (const line of fileContents.split('\n')) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith(';') || trimmedLine.startsWith('#') || trimmedLine.startsWith('[')) {
            continue; // ignore ini comments and sections
        }
        const equalsIdx = trimmedLine.indexOf('=');
        if (equalsIdx === -1) {
            continue; // skip lines without key=value format
        }
        const key = line.slice(0, equalsIdx).trim();
        const value = line.slice(equalsIdx + 1).trim();
        config[key] = value;
    }
    return config;
}
