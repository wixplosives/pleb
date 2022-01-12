import readline from 'readline';
import cursor from 'cli-cursor';
import { cyan, green, underline } from 'colorette';
import type { INpmPackage } from '@wixc3/resolve-directory-context';
import { type Modes, type PossibleVersions, modesToIndex } from './semver.js';

export function versionSelector({
  project,
  rootPackage,
  packages,
  possibleVersions,
  mode = 'commutative',
  onSelect,
  onCancel,
}: {
  project: string;
  rootPackage: INpmPackage;
  packages: INpmPackage[];
  possibleVersions: PossibleVersions[];
  mode?: Modes;
  onSelect?: (versionMap: Record<string, string>) => void;
  onCancel?: () => void;
}) {
  const possibilitiesSize = possibleVersions[0]!.length;
  const paddingSize = getPaddingSize(packages);
  const selected: number[] = packages.map(() => modesToIndex[mode]);
  const state = { current: 0 };
  const writeLine = lineRenderer();

  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', handleKey);
  cursor.hide(process.stdout);
  process.stdout.cursorTo(0, 0);
  process.stdout.clearScreenDown(render);

  function handleKey(_: string, key: { ctrl: boolean; name: string }) {
    if (key.name === 'up') {
      state.current--;
      if (state.current < 0) {
        state.current = packages.length - 1;
      }
    } else if (key.name === 'down') {
      state.current++;
      if (state.current >= packages.length) {
        state.current = 0;
      }
    } else if (key.name === 'left') {
      selected[state.current]--;
      if (selected[state.current]! < 0) {
        selected[state.current] = possibilitiesSize - 1;
      }
    } else if (key.name === 'right') {
      selected[state.current]++;
      if (selected[state.current]! >= possibilitiesSize) {
        selected[state.current] = 0;
      }
    } else if (key.name === 'return') {
      const versionMap = packages.reduce<Record<string, string>>((acc, { displayName }, i) => {
        acc[displayName] = possibleVersions[i]![selected[i]!]!.version;
        return acc;
      }, {});
      onSelect?.(versionMap);
    } else if (key.ctrl && key.name === 'c') {
      onCancel?.();
    }
    render();
  }

  function render() {
    process.stdout.cursorTo(0, 0);
    writeLine(underline(`Release for ${rootPackage.displayName} in ${project}`), -1);

    packages.forEach(({ displayName }, i) => {
      const versions = possibleVersions[i]!;
      const name = padTo(`${displayName}@${versions[0].version}`, paddingSize);
      const arrow = ` -> `;
      const selectedVersion = versions[selected[i]!]!;
      const version = `${selectedVersion.version} (${selectedVersion.value})`;

      writeLine(i === state.current ? cyan(name) + arrow + green(version) : name + arrow + version, i);
    });
  }
}

function lineRenderer() {
  const rendered: string[] = [];
  return function writeLine(line: string, index: number) {
    if (rendered[index] !== line) {
      process.stdout.clearLine(1);
    }
    if (index !== -1) {
      rendered[index] = line;
    }
    process.stdout.write(`${line}\n`);
  };
}

function getPaddingSize(packages: INpmPackage[]) {
  const maxPackageNameLength = packages.reduce((max, { displayName }) => Math.max(max, displayName.length), 0);
  const maxCurrentVersionLength = packages.reduce(
    (max, { packageJson: { version = '0.0.0' } }) => Math.max(max, version.length),
    0
  );
  return maxPackageNameLength + maxCurrentVersionLength + /*@*/ 1;
}

function padTo(str: string, length: number) {
  return `${str}${' '.repeat(length - str.length)}`;
}
