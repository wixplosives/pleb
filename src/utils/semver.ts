import type { PackageJson } from 'type-fest';
import semver from 'semver';

export const modes = ['current', 'commutative', 'prerelease', 'patch', 'minor', 'major'] as const;

export type Modes = typeof modes[number];

export type PossibleVersions = readonly [
  { version: string; value: 'current' },
  { version: string; value: 'commutative' },
  { version: string; value: 'prerelease' },
  { version: string; value: 'patch' },
  { version: string; value: 'minor' },
  { version: string; value: 'major' }
];

export const modesToIndex = {
  current: 0,
  commutative: 1,
  prerelease: 2,
  patch: 3,
  minor: 4,
  major: 5,
} as const;

export function getPossibleReleasesOptions(current: string, commutative: string, identifier = ''): PossibleVersions {
  const pre = identifier ? ('pre' as const) : ('' as const);
  const patch = String(semver.inc(current, `${pre}patch`, identifier));
  const minor = String(semver.inc(current, `${pre}minor`, identifier));
  const major = String(semver.inc(current, `${pre}major`, identifier));

  const prerelease = String(semver.inc(current, 'prerelease', identifier));

  return [
    { version: current, value: 'current' },
    { version: commutative, value: 'commutative' },
    { version: prerelease, value: 'prerelease' },
    { version: patch, value: 'patch' },
    { version: minor, value: 'minor' },
    { version: major, value: 'major' },
  ];
}

export function preProcessPackages({
  packagesJson,
  releaseIdentifier,
  ignoredPackages,
}: {
  packagesJson: readonly PackageJson[];
  releaseIdentifier: string;
  ignoredPackages: Set<number>;
}) {
  const { commutative, minRelease } = commutativeVersion(
    packagesJson.filter((_, i) => !ignoredPackages.has(i)),
    releaseIdentifier
  );
  const possibleVersions = packagesJson.map(({ version }, i) =>
    getPossibleReleasesOptions(
      version!, //TODO: fixme??? (!)
      ignoredPackages.has(i) ? '-' : commutative,
      releaseIdentifier
    )
  );

  return {
    possibleVersions,
    commutative,
    commutativeMinRelease: minRelease,
  } as const;
}

export function commutativeVersion(packages: { version?: string }[], releaseIdentifier: string) {
  let diff: semver.ReleaseType = 'patch';
  let max = '';

  for (const p of packages) {
    if (!p.version) {
      throw new Error('missing version');
    }
    if (!max) {
      max = p.version;
    }
    if (semver.gte(p.version, max)) {
      const resDiff = semver.diff(p.version, max);
      if (resDiff === null) {
        continue;
      }
      diff = resDiff;
      max = p.version;
    }
  }

  // TODO: help needed
  if (diff === 'prerelease') {
    throw new Error('prerelease are not supported');
  }

  // TODO: help needed???
  if (diff?.startsWith('pre')) {
    diff = diff.slice(3) as 'major' | 'minor' | 'patch';
  }

  if (releaseIdentifier) {
    diff = 'prerelease';
  }

  const commutative = semver.inc(max, diff, releaseIdentifier) || '-';

  return { commutative, max, minRelease: diff };
}
