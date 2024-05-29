import { IssueCommentEvent } from '@octokit/webhooks-types'
import { assert } from '@tldraw/utils'
import { createOrUpdateHuppyComment, updateHuppyCommentIfExists } from '../comment'
import { TLDRAW_ORG, TLDRAW_PUBLIC_REPO } from '../config'
import { Ctx } from '../ctx'
import { Flow } from '../flow'

const TARGET_REPO = TLDRAW_PUBLIC_REPO
const CLA_URL =
	'https://tldraw.notion.site/Contributor-License-Agreement-4d529dd5e4b3438b90cdf2a2f9d7e7e6?pvs=4'
const SIGNING_MESSAGE = 'I have read and agree to the Contributor License Agreement.'
const RE_CHECK_MESSAGE = '/huppy check cla'
const CLA_SIGNATURES_BRANCH = 'cla-signees'

const pullRequestActionsToCheck = ['opened', 'synchronize', 'reopened', 'edited']

interface Signing {
	githubId: number
	signedAt: string
	signedVersion: 1
	signingComment: string
}
interface SigneeInfo {
	unsigned: Set<string>
	signees: Map<string, { signing: Signing; fileSha: string }>
	total: number
}

export const collectClaSignatures: Flow = {
	name: 'collectClaSignatures',

	onPullRequest: async (ctx, event) => {
		if (event.repository.full_name !== `${TLDRAW_ORG}/${TARGET_REPO}`) return
		if (!pullRequestActionsToCheck.includes(event.action)) return

		await checkAllContributorsHaveSignedCla(ctx, event.pull_request)
	},

	onIssueComment: async (ctx, event) => {
		if (event.repository.full_name !== `${TLDRAW_ORG}/${TARGET_REPO}`) return
		if (event.issue.pull_request === undefined) return

		switch (event.comment.body.trim().toLowerCase()) {
			case SIGNING_MESSAGE.toLowerCase():
				await addSignatureFromComment(ctx, event)
				break
			case RE_CHECK_MESSAGE.toLowerCase(): {
				const pr = await ctx.octokit.rest.pulls.get({
					owner: TLDRAW_ORG,
					repo: TARGET_REPO,
					pull_number: event.issue.number,
				})
				await checkAllContributorsHaveSignedCla(ctx, pr.data)
				await ctx.octokit.rest.reactions.createForIssueComment({
					owner: TLDRAW_ORG,
					repo: TARGET_REPO,
					comment_id: event.comment.id,
					content: '+1',
				})
				break
			}
		}
	},
}

async function addSignatureFromComment(ctx: Ctx, event: IssueCommentEvent) {
	const existingSignature = await getClaSigneeInfo(ctx, event.comment.user.login.toLowerCase())
	if (existingSignature) {
		await ctx.octokit.rest.reactions.createForIssueComment({
			owner: TLDRAW_ORG,
			repo: TARGET_REPO,
			comment_id: event.comment.id,
			content: 'heart',
		})
		return
	}

	const newSigning: Signing = {
		githubId: event.comment.user.id,
		signedAt: event.comment.created_at,
		signedVersion: 1,
		signingComment: event.comment.html_url,
	}

	await ctx.octokit.rest.repos.createOrUpdateFileContents({
		owner: TLDRAW_ORG,
		repo: TLDRAW_PUBLIC_REPO,
		path: `${event.comment.user.login.toLowerCase()}.json`,
		branch: CLA_SIGNATURES_BRANCH,
		content: Buffer.from(JSON.stringify(newSigning, null, '\t')).toString('base64'),
		message: `Add CLA signature for ${event.comment.user.login}`,
	})

	const pr = await ctx.octokit.rest.pulls.get({
		owner: TLDRAW_ORG,
		repo: TARGET_REPO,
		pull_number: event.issue.number,
	})
	await checkAllContributorsHaveSignedCla(ctx, pr.data)

	await ctx.octokit.rest.reactions.createForIssueComment({
		owner: TLDRAW_ORG,
		repo: TARGET_REPO,
		comment_id: event.comment.id,
		content: 'heart',
	})
}

async function checkAllContributorsHaveSignedCla(
	ctx: Ctx,
	pr: { head: { sha: string }; number: number }
) {
	const info = await getClaSigneesFromPr(ctx, pr)

	if (info.unsigned.size === 0) {
		await ctx.octokit.rest.repos.createCommitStatus({
			owner: TLDRAW_ORG,
			repo: TARGET_REPO,
			sha: pr.head.sha,
			state: 'success',
			context: 'CLA Signatures',
			description: getStatusDescription(info),
		})
		await updateHuppyCommentIfExists(ctx, pr.number, getHuppyCommentContents(info))
		return
	}

	await ctx.octokit.rest.repos.createCommitStatus({
		owner: TLDRAW_ORG,
		repo: TARGET_REPO,
		sha: pr.head.sha,
		state: 'failure',
		context: 'CLA Signatures',
		description: getStatusDescription(info),
	})

	await createOrUpdateHuppyComment(ctx, pr.number, getHuppyCommentContents(info))
}

async function getClaSigneesFromPr(ctx: Ctx, pr: { number: number }): Promise<SigneeInfo> {
	const allAuthors = new Set<string>()

	const commits = await ctx.octokit.paginate(
		'GET /repos/{owner}/{repo}/pulls/{pull_number}/commits',
		{
			owner: TLDRAW_ORG,
			repo: TARGET_REPO,
			pull_number: pr.number,
		}
	)

	for (const commit of commits) {
		if (commit.author && !commit.author.login.endsWith('[bot]')) {
			allAuthors.add(commit.author.login.toLowerCase())
		}
	}

	const signees = new Map<string, { signing: Signing; fileSha: string }>()
	const unsigned = new Set<string>()
	for (const author of [...allAuthors].sort()) {
		const signeeInfo = await getClaSigneeInfo(ctx, author)
		if (signeeInfo) {
			signees.set(author, signeeInfo)
		} else {
			unsigned.add(author)
		}
	}

	return { signees, unsigned, total: allAuthors.size }
}

async function getClaSigneeInfo(ctx: Ctx, authorName: string) {
	try {
		const response = await ctx.octokit.rest.repos.getContent({
			owner: TLDRAW_ORG,
			repo: TLDRAW_PUBLIC_REPO,
			path: `${authorName}.json`,
			ref: 'cla-signees',
		})
		assert(!Array.isArray(response.data), 'Expected a file, not a directory')
		assert(response.data.type === 'file', 'Expected a file, not a directory')
		return {
			signing: JSON.parse(
				Buffer.from(response.data.content, 'base64').toString('utf-8')
			) as Signing,
			fileSha: response.data.sha,
		}
	} catch (err: any) {
		if (err.status === 404) {
			return null
		}
		throw err
	}
}

function getHuppyCommentContents(info: SigneeInfo) {
	if (info.signees.size > 1) {
		let listing = `**${info.signees.size}** out of **${info.total}** ${
			info.total === 1 ? 'authors has' : 'authors have'
		} signed the [CLA](${CLA_URL}).\n\n`

		for (const author of info.unsigned) {
			listing += `- [ ] @${author}\n`
		}
		for (const author of info.signees.keys()) {
			listing += `- [x] @${author}\n`
		}

		if (info.unsigned.size === 0) {
			return `${listing}\n\nThanks!`
		}

		return `Hey, thanks for your pull request! Before we can merge your PR, each author will need to sign our [Contributor License Agreement](${CLA_URL}) by posting a comment that reads:

> ${SIGNING_MESSAGE}
---

${listing}`
	} else {
		const author = [...info.signees.keys()][0]

		if (info.unsigned.size === 0) {
			return `**${author}** has signed the [Contributor License Agreement](${CLA_URL}). Thanks!`
		}

		return `Hey, thanks for your pull request! Before we can merge your PR, you will need to sign our [Contributor License Agreement](${CLA_URL}) by posting a comment that reads:

> ${SIGNING_MESSAGE}`
	}
}

function getStatusDescription(info: SigneeInfo) {
	return `${info.signees.size}/${info.total} signed. Comment '${RE_CHECK_MESSAGE}' to re-check.`
}
