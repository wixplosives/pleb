export function parseIni(fileContents: string): Record<string, string> {
    const config: Record<string, string> = {};
    const lines = fileContents.split('\n').map(line => line.trim());
    for (const line of lines) {
        if (!line || line.startsWith(';') || line.startsWith('#') || line.startsWith('[')) {
            continue; // ignore empty lines, ini comments and sections
        }
        const equalsIdx = line.indexOf('=');
        if (equalsIdx === -1) {
            continue; // skip lines without key=value format
        }
        const key = line.slice(0, equalsIdx).trim();
        const value = line.slice(equalsIdx + 1).trim();
        config[key] = value;
    }
    return config;
}
