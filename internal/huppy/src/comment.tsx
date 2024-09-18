import { APP_USER_NAME, TLDRAW_ORG, TLDRAW_PUBLIC_REPO } from './config'
import { Ctx } from './ctx'

export async function findHuppyCommentIfExists(ctx: Ctx, prNumber: number) {
	const { data: comments } = await ctx.octokit.rest.issues.listComments({
		owner: TLDRAW_ORG,
		repo: TLDRAW_PUBLIC_REPO,
		issue_number: prNumber,
		per_page: 100,
		sort: 'created',
		direction: 'asc',
	})

	const foundComment = comments.find((comment) => comment.user?.login === APP_USER_NAME)

	return foundComment ?? null
}

export async function updateHuppyCommentIfExists(ctx: Ctx, prNumber: number, body: string) {
	const foundComment = await findHuppyCommentIfExists(ctx, prNumber)
	if (foundComment) {
		await ctx.octokit.rest.issues.updateComment({
			owner: TLDRAW_ORG,
			repo: TLDRAW_PUBLIC_REPO,
			comment_id: foundComment.id,
			body,
		})
	}
}

export async function createOrUpdateHuppyComment(ctx: Ctx, prNumber: number, body: string) {
	const foundComment = await findHuppyCommentIfExists(ctx, prNumber)
	if (foundComment) {
		await ctx.octokit.rest.issues.updateComment({
			owner: TLDRAW_ORG,
			repo: TLDRAW_PUBLIC_REPO,
			comment_id: foundComment.id,
			body,
		})
	} else {
		await ctx.octokit.rest.issues.createComment({
			owner: TLDRAW_ORG,
			repo: TLDRAW_PUBLIC_REPO,
			issue_number: prNumber,
			body,
		})
	}
}
