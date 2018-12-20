[![Build Status](https://travis-ci.com/wixplosives/lerna-publisher.svg?branch=master)](https://travis-ci.com/wixplosives/lerna-publisher)

# Lerna Publisher

Custom publishing cli for lerna/yarn/workspaces projects.

lerna-publisher will check versions of all subpackages in monorepo and publish them to npmjs if version specified in package.json of subpackage is higher than version in npmjs.

Primary motivation is to allow developer to run lerna publish command locally even if developer does not have permissions to publish to npmjs.CI will pickup tags commited by lerna and publish packages with unpublished versions.

## Installation
```
npm install lerna-publisher -g
```

## Usage

1. Commit your changes to git
1. run ```lerna publish --skip-npm```
1. run ```lerna-publisher path/to/your/repo``` - this step is usually done in CI that runs with different npm authentication.

## Example of Travis configuration

Add NPM_TOKEN environment variable in Travis Build Settings

Add following to the end of your .travis.yml

```
before_deploy:
  - npm install lerna-publisher -g
  - echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > ~/.npmrc

deploy:
  provider: script
  script: lerna-publisher .
  on:
    os: linux
    node: 10
    branch: master
    tags: true
```

## CLI Options

```
  -v, --version                       output the version number
  -h, --help                          output usage information
```

### License

MIT
