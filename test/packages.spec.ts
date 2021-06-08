import { join } from 'path';
import { expect } from 'chai';
import { INpmPackage, sortPackagesByDepth } from '../src/utils/npm-package';
import { resolveWorkspacePackages } from '../src/utils/yarn-workspaces';

describe('resolveWorkspacePackages', () => {
  const yarnWorkspaceFixturePath = join(__dirname, 'fixtures/yarn-workspace');
  it('finds packages when workspace definition contains a glob', async () => {
    const packages = await resolveWorkspacePackages(yarnWorkspaceFixturePath, ['packages/*']);
    expect(packages.map(({ displayName }) => displayName)).to.eql(['yarn-workspace-a', 'yarn-workspace-b']);
  });

  it('finds packages only once, even if targeted by multiple definitions', async () => {
    const packages = await resolveWorkspacePackages(yarnWorkspaceFixturePath, ['packages/b', 'packages/*']);
    expect(packages.map(({ displayName }) => displayName)).to.eql(['yarn-workspace-b', 'yarn-workspace-a']);
  });
});

describe('sortPackagesByDepth', () => {
  const createPackage = (packageName: string, dependencies?: Record<string, string>): INpmPackage => ({
    displayName: packageName,
    packageJson: { name: packageName, dependencies },
    directoryPath: '/',
    packageJsonContent: ``,
    packageJsonPath: '/',
  });

  it('sorts two packages depending on one another', () => {
    const packageA = createPackage('packageA', { packageB: '1.0.0' });
    const packageB = createPackage('packageB');
    const sorted = sortPackagesByDepth([packageA, packageB]);
    expect(sorted.map((s) => s.displayName)).to.eql(['packageB', 'packageA']);
  });

  it('sorts several packages with isolated packages in the middle', () => {
    const packageA = createPackage('packageA', { packageB: '1.0.0' });
    const packageB = createPackage('packageB', { packageC: '1.0.0' });
    const packageC = createPackage('packageC');
    const packageD = createPackage('packageD');

    const sorted = sortPackagesByDepth([packageA, packageD, packageB, packageC]);
    expect(sorted.map((s) => s.displayName)).to.eql(['packageC', 'packageB', 'packageA', 'packageD']);
  });
});
