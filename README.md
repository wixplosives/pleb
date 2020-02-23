# pleb

[![Build Status](https://github.com/wixplosives/pleb/workflows/tests/badge.svg)](https://github.com/wixplosives/pleb/actions)
[![npm version](https://badge.fury.io/js/pleb.svg)](https://badge.fury.io/js/pleb)

CLI to automate several npm package tasks.

## Features

-   Works locally and in CI. `npx pleb [command]` in mind.
-   Supports both single package and yarn workspace setups.
-   Skips already-published versions when publishing.
-   Loads and uses user's npm authentication.

## Commands

### `publish`

Publish unpublished packages.

**pleb** assumes packages have already been built when publishing. If on-demand building is required, a "prepack" script can be used to build right before packing the package: `"prepack": "npm run build"`

### `snapshot`

Publish a snapshot of the packages (based on git commit hash)

The snapshot version (e.g. `2.0.0-cc10763`) is combined from the current version in `package.json`, and the first seven characters of the current git commit hash.

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
            - name: Use Node.js 12
              uses: actions/setup-node@v1
              with:
                  node_version: 12
                  registry-url: 'https://registry.npmjs.org/'
            - run: npm i -g yarn@1
            - run: yarn
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
        node_js: 12
        condition: $TRAVIS_OS_NAME = linux
```

### License

MIT
