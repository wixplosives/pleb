# pleb

[![Build Status](https://travis-ci.com/wixplosives/pleb.svg?branch=master)](https://travis-ci.com/wixplosives/pleb)
[![npm version](https://badge.fury.io/js/pleb.svg)](https://badge.fury.io/js/pleb)

Custom publishing cli for lerna/yarn/workspaces projects.

**pleb** checks versions of all subpackages in a mono-repo and publishes them to npmjs if version specified in package.json of subpackage is higher than version in npmjs.

Primary motivation is to allow developer to run lerna publish command locally even if developer does not have permissions to publish to npmjs.CI will pickup tags commited by lerna and publish packages with unpublished versions.

## Prepack

**pleb** will assume you already have built version of your package in the folder where lerna publisher runs.
To make sure you have built your package, add following to your package.json scripts key.

`"prepack": "npm run build"`

You need to have line like this in every package.json of every package you want to publish to npm.

## Expected Flow

1. Bump versions using `lerna version` or a similar tool.
2. Commit changes to git.
3. `pleb` detects unpublished versions in CI, and publishes them to npm.

### Travis Integration

Inject `NPM_TOKEN` as secure environment variable in Travis repository settings.

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
