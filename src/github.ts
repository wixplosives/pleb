const GitHub = require('github-api')

export async function postLinkToPRTest(textToPublish: string, linkToPublish: string,
                                       authToken: string, org: string, repo: string,
                                       prNumber: number) {
    let result = true
    try {
        const gh = new GitHub({token: authToken})
        const repoObj = await gh.getRepo(org, repo)
        const pullReguest = await repoObj.getPullRequest(prNumber)
        const newBody  = pullReguest.data.body + '\r\n' + `:frog: [${textToPublish}](${linkToPublish})`
        await repoObj.updatePullRequest(prNumber, {body: newBody} )
    } catch (e) {
        result = false
        console.error(e)
    }
    return result
}
