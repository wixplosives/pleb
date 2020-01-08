import path from 'path';
import childProcess from 'child_process';

import { uploadFolder } from './aws';
import { postLinkToPRTest } from './github';
import { resolvePackages } from './resolve-packages';

export async function deploy(directoryPath: string, packageName: string, prNum: number) {
    const packages = resolvePackages(directoryPath);
    const pkgToDeploy = packages.find(({ packageJson }) => packageJson.name === packageName);
    if (!pkgToDeploy) {
        throw new Error(`cannot find package ${packageName}`);
    }
    const bucketName = process.env.AWS_BUCKET_NAME;
    const bucketLink = `http://${bucketName}.s3-website-us-east-1.amazonaws.com/`;
    const branchName = process.env.TRAVIS_PULL_REQUEST_BRANCH || '';
    const githubToken = process.env.GITHUB_TOKEN || '';
    const githubSlug = process.env.TRAVIS_REPO_SLUG || '';
    const slugParts = githubSlug.split('/');
    const repo = slugParts[1];
    const org = slugParts[0];
    const relativePathInBucket = path.join(pkgToDeploy.packageJson.name!, branchName);

    console.log('Deploy package from folder: ', pkgToDeploy.directoryPath, 'to', bucketName, relativePathInBucket);
    // pack it before deploying demo server

    childProcess.execSync('npm pack', { cwd: pkgToDeploy.directoryPath, stdio: 'inherit' });

    const pathToPublish = path.join(pkgToDeploy.directoryPath, 'dist');
    await uploadFolder(pathToPublish, pkgToDeploy.packageJson.name!, branchName);
    console.log('Uploaded folder to s3.');
    const cureentToime = new Date();
    const textToPublish = 'Demo server. Deployed at ' + cureentToime.toString();
    const linkToPublish = bucketLink + relativePathInBucket;
    console.log('Link to publish', linkToPublish);
    await postLinkToPRTest(textToPublish, linkToPublish, githubToken, org, repo, prNum);
    console.log('Posted link to PR result.');
}
