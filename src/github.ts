const GitHub = require('github-api');

export async function addMessageToPRBody(body: string, text: string): Promise<string> {
    const spearator = '\n---Demo Link---\n';
    let cleanBody = body;
    const parts = body.split(spearator);
    if (parts.length > 1) {
        cleanBody = parts[0];
    }
    const retVal = cleanBody + spearator + text;
    return retVal;
}

export async function postLinkToPRTest(
    textToPublish: string,
    linkToPublish: string,
    authToken: string,
    org: string,
    repo: string,
    prNumber: number
) {
    let result = true;
    try {
        const gh = new GitHub({ token: authToken });
        const repoObj = await gh.getRepo(org, repo);
        const pullReguest = await repoObj.getPullRequest(prNumber);
        const newBody = await addMessageToPRBody(pullReguest.data.body, `:frog: [${textToPublish}](${linkToPublish})`);
        console.log('Update PR:', org, repo, prNumber, newBody);
        await repoObj.updatePullRequest(prNumber, { body: newBody });
    } catch (e) {
        result = false;
        console.error(e);
    }
    return result;
}
