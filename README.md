# pleb

[![Build Status](https://travis-ci.com/wixplosives/pleb.svg?branch=master)](https://travis-ci.com/wixplosives/pleb)[![npm version](https://badge.fury.io/js/pleb.svg)](https://badge.fury.io/js/pleb)

Custom publishing cli for lerna/yarn/workspaces projects.

**pleb** will check versions of all subpackages in monorepo and publish them to npmjs if version specified in package.json of subpackage is higher than version in npmjs.

Primary motivation is to allow developer to run lerna publish command locally even if developer does not have permissions to publish to npmjs.CI will pickup tags commited by lerna and publish packages with unpublished versions.

# Prepack

**pleb** will assume you already have built version of your package in the folder where lerna publisher runs.
To make sure you have built your package, add following to your package.json scripts key.

`"prepack": "npm run build"`

You need to have line like this in every package.json of every package you want to publish to npm.

## Usage

1. Commit your changes to git
1. run `lerna version`

### Example of Travis configuration

Add NPM_TOKEN environment variable in Travis Build Settings

Add following to the end of your .travis.yml

```
before_deploy:
  - echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > ~/.npmrc

deploy:
  skip_cleanup: true
  provider: script
  script: npx pleb publish
  on:
    os: linux
    node: 10
    branch: master
    tags: true
```

### CLI Options

```
  -v, --version                       output the version number
  -h, --help                          output usage information
```

### License

MIT
