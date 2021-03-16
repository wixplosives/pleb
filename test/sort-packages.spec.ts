import { expect } from 'chai';
import { INpmPackage, sortPackagesByDepth } from '../src/utils/npm-package';

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
