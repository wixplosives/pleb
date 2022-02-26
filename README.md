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

## Integration

### GitHub Actions

Inject `NPM_TOKEN` as a secret in GitHub's repository settings.

Save the following as `npm.yml`:

```yml
name: npm
on:
  push:
    branches: [master]
jobs:
  npm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Use Node.js 16
        uses: actions/setup-node@v3
        with:
          node-version: 16
          registry-url: 'https://registry.npmjs.org/'
      - run: npm ci
      - run: npx pleb publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Travis CI

Inject `NPM_TOKEN` as a secure environment variable in Travis repository settings.

Add following to the end of `.travis.yml`:

```yml
before_deploy:
  - echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > ~/.npmrc

deploy:
  skip_cleanup: true
  provider: script
  script: npx pleb publish
  on:
    branch: master
    node_js: 16
    condition: $TRAVIS_OS_NAME = linux
```

### License

MIT
