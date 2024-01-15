import semver from 'semver';

const colors = {
  bgWhite: (text: string) => '\x1b[47m' + text + '\x1b[0m',
  green: (text: string) => '\x1b[32m' + text + '\x1b[0m',
  red: (text: string) => '\x1b[31m' + text + '\x1b[0m',
  yellow: (text: string) => '\x1b[33m' + text + '\x1b[0m',
};

export type ChangeType = semver.ReleaseType | 'unknown';

/**
 * Returns a colorized message based on the type of change.
 */
export function colorizeChangeType(color: boolean, changeType: ChangeType, message: string) {
  if (!color) {
    return message;
  }
  switch (changeType) {
    case 'unknown':
      return message;
    case 'prepatch':
    case 'preminor':
    case 'premajor':
    case 'prerelease':
      return colors.bgWhite(colors.red(message));
    case 'major':
      return colors.red(message);
    case 'minor':
      return colors.yellow(message);
    case 'patch':
      return colors.green(message);
  }
}

/**
 * Returns the type of change between two versions.
 */
export function getChangeType(oldVersion: string, newVersion: string): ChangeType {
  const oldVer = semver.coerce(oldVersion);
  const newVer = semver.coerce(newVersion);
  if (!oldVer || !newVer) {
    return 'unknown';
  }
  return semver.diff(oldVer, newVer) ?? 'unknown';
}

/**
 * Groups a map of packages by their change type. into a constant order of change types.
 */
export function groupByChangeType<U extends { changeType: ChangeType }>(map: Map<string, U>) {
  const groups: Record<ChangeType, [string, U][]> = {
    prerelease: [],
    premajor: [],
    major: [],
    preminor: [],
    minor: [],
    prepatch: [],
    patch: [],
    unknown: [],
  };
  for (const [key, value] of map) {
    groups[value.changeType].push([key, value]);
  }
  return groups;
}
