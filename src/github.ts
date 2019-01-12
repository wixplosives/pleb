/*
https://developer.github.com/v3/pulls/#update-a-pull-request 
const {BUILD_VCS_NUMBER, VCS_BRANCH_NAME, agentType} = process.env;

if (agentType != 'pullrequest' || !VCS_BRANCH_NAME) {
    console.log('Not in ci, ignoring');
    process.exit(0);
}

const promisify = require('promisify');
const GitHub = require('github-api');
const {readFileSync} = require('fs');
const randomEmoji = require('random-unicode-emoji');
const git = require('simple-git/promise')();

const tag = 'POST BUILD DEMO'

const token = readFileSync('/opt/wix-ci-secrets/github_token')
    .toString()
    .trim()

if (!token.length) {
    console.log('No token for GitHub, ignoring');
    process.exit(0);
}

const buildEmoji = randomEmoji.random({count: 1})[0];

const getUrlInfo = (message, separator = '---') => {
    return `
${separator}
[${buildEmoji} ${tag}](https://static.parastorage.com/services/auto-cms/${BUILD_VCS_NUMBER}/index.html) for \`${message}\``;
};

const cleanBody = body => {
    let lines = body.split('\n');
    if (lines[lines.length - 1].includes(tag)) {
        lines = lines.slice(0, -3);
    }
    return lines.join('\n');
};

const gh = new GitHub({token});
const PRNumber = VCS_BRANCH_NAME.replace(/\/merge$/, '');

const issues = promisify.object({
    getIssue: promisify.cb_func(),
    editIssue: promisify.cb_func(),
    createIssueComment: promisify.cb_func()
})(gh.getIssues('wix-private', 'auto-views'));

(async () => {
    try {
        const issue = await issues.getIssue(PRNumber);
        const {message} = (await git.log()).all[1];
        await Promise.all([
            issues.createIssueComment(PRNumber, getUrlInfo(message, '')),
            issues.editIssue(PRNumber, {
                body: cleanBody(issue.body) + getUrlInfo(message)
            })
        ]);
    } catch (e) {
        console.error(e.message);
    }
})();
*/
