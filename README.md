[![Build Status](https://travis-ci.com/wixplosives/lerna-publisher.svg?branch=master)](https://travis-ci.com/wixplosives/lerna-publisher)[![npm version](https://badge.fury.io/js/lerna-publisher.svg)](https://badge.fury.io/js/lerna-publisher)

# Lerna Publisher

Custom publishing cli for lerna/yarn/workspaces projects.

lerna-publisher will check versions of all subpackages in monorepo and publish them to npmjs if version specified in package.json of subpackage is higher than version in npmjs.

Primary motivation is to allow developer to run lerna publish command locally even if developer does not have permissions to publish to npmjs.CI will pickup tags commited by lerna and publish packages with unpublished versions.

## Usage

1. Commit your changes to git
1. run ```lerna version```

### Example of Travis configuration

Add NPM_TOKEN environment variable in Travis Build Settings

Add following to the end of your .travis.yml

```
before_deploy:
  - npm install lerna-publisher -g
  - echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > ~/.npmrc

deploy:
  skip_cleanup: true
  provider: script
  script: lerna-publisher
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

## Publish demo link for Pull Request in github

You can use lerna-publisher to generate static demo sites for your pull requests.
Environmnet variables

1. GITHUB_TOKEN='your github token'
1. TRAVIS_PULL_REQUEST - travis sets PR number here
1. TRAVIS_BRANCH - travis sets branch name here
1. AWS_BUCKET_NAME - name of the s3 bucket to upload you demo to 'demo.youdomain.demosites'
1. AWS_ACCESS_KEY_ID='YOURAWSSECRETKEY'
1. AWS_SECRET_ID='Yourawssecretid'

Than run:

```
  lerna-publisher deploydemo @wix/lpt-server /Users/youruser/dev/lerna-publish-test
```

### License

MIT
