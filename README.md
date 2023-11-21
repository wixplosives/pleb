# pleb

[![Build Status](https://github.com/wixplosives/pleb/workflows/tests/badge.svg)](https://github.com/wixplosives/pleb/actions)
[![npm version](https://badge.fury.io/js/pleb.svg)](https://badge.fury.io/js/pleb)

CLI to automate several npm package tasks.

## Features

- Works locally and in CI. `npx pleb [command]` in mind.
- Supports both single package and yarn workspace setups.
- Skips already-published versions and private packages when publishing.
- Loads and uses user's npm authentication.

## Commands

### `publish`

Publish unpublished packages.

**pleb** assumes packages have already been built when publishing. If on-demand building is required, a "prepack" script can be used to build right before packing the package: `"prepack": "npm run build"`

### `upgrade`

Upgrade `dependencies` and `devDependencies` of all packages.
Checks the registry for `latest` version of each package, and updates `package.json` files with the new request.

## Configuration File

**pleb** looks up `pleb.config.js` (or `.mjs` / `.cjs`) in the current directory and loads configuration from it, if exists.

e.g.:

```js
// pleb.config.mjs

/** @type import('pleb').PlebConfiguration */
export default {
  pinnedPackages: ['react', 'react-dom', { name: 'execa', reason: 'newer version are pure ESM' }],
};
```

Available configuration fields:

- `"pinnedPackages"` - skip upgrading specified packages during `pleb upgrade`. Any skipped packages, with their optional `reason`, will be printed in the upgrade report.

## Integration

### GitHub Actions

Inject `NPM_TOKEN` as a secret in GitHub's repository settings.

Save the following as `npm.yml`:

```yml
name: npm
on:
  push:
    branches: [main]
jobs:
  npm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org/'
      - run: npm ci
      - run: npx pleb publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### License

MIT
