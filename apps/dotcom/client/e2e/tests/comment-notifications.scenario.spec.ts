import { Locator, Page } from '@playwright/test'
import { expect, test } from '../fixtures/scenario-test'
import type { DotcomActor } from '../fixtures/scenario-test'

// Comment notifications feed scenarios: the sidebar bell, its unread badge, and the entries the
// comment feed and `reactions` synced queries produce. Comments are written straight into the file's
// store (same records the composer builds) so each test exercises the sync path — room → Durable
// Object drain → Postgres → Zero → the other user's feed — rather than the comment tool's UI.
//
// That path is several hops, so feed assertions poll well past the default expect timeout.
test.describe.configure({ mode: 'parallel', timeout: 90_000 })

const FEED_TIMEOUT = 45_000

interface PostedComment {
	fileId: string
	threadId: string
	commentId: string
}

/** Post a comment as the actor on the file they have open, starting a thread unless one is given. */
async function postComment(
	actor: DotcomActor,
	text: string,
	opts: { threadId?: string; mentionUserId?: string } = {}
): Promise<PostedComment> {
	return await actor.page.evaluate(
		({ text, threadId, mentionUserId }) => {
			const editor = (window as any).editor
			const app = (window as any).app
			const pageId = editor.getCurrentPageId()
			const now = Date.now()
			const content: any[] = [{ type: 'text', text }]
			if (mentionUserId) {
				content.push({ type: 'text', text: ' ' })
				content.push({ type: 'mention', attrs: { id: mentionUserId, label: 'someone' } })
			}
			const body = { type: 'doc', content: [{ type: 'paragraph', content }] }
			const records: any[] = []
			let resolvedThreadId = threadId
			if (!resolvedThreadId) {
				resolvedThreadId = `comment-thread:${crypto.randomUUID()}`
				records.push({
					id: resolvedThreadId,
					typeName: 'comment-thread',
					pageId,
					anchor: { type: 'point', x: 100, y: 100 },
					createdBy: app.userId,
					createdAt: now,
					resolved: null,
					isDeleted: false,
					meta: {},
				})
			}
			const commentId = `comment:${crypto.randomUUID()}`
			records.push({
				id: commentId,
				typeName: 'comment',
				threadId: resolvedThreadId,
				pageId,
				authorId: app.userId,
				createdAt: now,
				editedAt: null,
				body,
				isDeleted: false,
				meta: {},
			})
			editor.store.put(records)
			const fileId = window.location.pathname.split('/f/')[1]
			return { fileId, threadId: resolvedThreadId, commentId }
		},
		{ text, threadId: opts.threadId, mentionUserId: opts.mentionUserId }
	)
}

/** Soft-delete a comment or thread record, the way the delete verbs do. */
async function softDelete(actor: DotcomActor, id: string) {
	await actor.page.evaluate((id) => {
		const editor = (window as any).editor
		const record = editor.store.get(id)
		if (!record) throw new Error(`record ${id} not in store`)
		editor.store.put([{ ...record, isDeleted: true }])
	}, id)
}

async function react(actor: DotcomActor, comment: PostedComment, emoji: string) {
	await actor.page.evaluate(
		({ comment, emoji }) => {
			const editor = (window as any).editor
			const app = (window as any).app
			const enc = encodeURIComponent
			editor.store.put([
				{
					id: `comment-reaction:${enc(comment.commentId)}:${enc(app.userId)}:${enc(emoji)}`,
					typeName: 'comment-reaction',
					commentId: comment.commentId,
					threadId: comment.threadId,
					pageId: editor.getCurrentPageId(),
					userId: app.userId,
					emoji,
					createdAt: Date.now(),
					meta: {},
				},
			])
		},
		{ comment, emoji }
	)
}

/**
 * Wait until another user's record has synced into the actor's room. A reply or reaction that
 * reaches the file's Durable Object before its thread or comment fails the Postgres foreign key,
 * and the drain prunes it from the room without a trace.
 */
async function waitForRecord(actor: DotcomActor, id: string) {
	await expect
		.poll(() => actor.page.evaluate((id) => !!(window as any).editor.store.get(id), id), {
			timeout: FEED_TIMEOUT,
		})
		.toBe(true)
}

async function userIdOf(actor: DotcomActor): Promise<string> {
	return await actor.page.evaluate(() => (window as any).app.userId)
}

function notificationsButton(page: Page) {
	return page.getByTestId('tla-notifications-button')
}

/** The open panel's list, opening it if needed: the bell toggles, so a second click would close it. */
async function openNotifications(actor: DotcomActor): Promise<Locator> {
	await actor.editor.ensureSidebarOpen()
	const list = actor.page.locator('.tlui-cmt-list')
	if (!(await list.isVisible().catch(() => false))) {
		await notificationsButton(actor.page).click()
	}
	await expect(list).toBeVisible()
	return list.locator('.tlui-cmt-list__item')
}

async function closeNotifications(actor: DotcomActor) {
	await actor.page.keyboard.press('Escape')
}

/** The feed entry whose preview holds `text`, polled until it arrives. */
async function expectNotification(actor: DotcomActor, text: string, byline: RegExp) {
	const items = await openNotifications(actor)
	const item = items.filter({ hasText: text })
	await expect(item, await panelDump(actor)).toBeVisible({ timeout: FEED_TIMEOUT })
	await expect(item).toContainText(byline)
	return item
}

async function panelDump(actor: DotcomActor) {
	const text = await actor.page
		.locator('.tlui-cmt-list')
		.innerText()
		.catch(() => '(no panel)')
	return `${actor.name} panel: ${text.replace(/\s+/g, ' ').slice(0, 400)}`
}

async function expectNoNotification(actor: DotcomActor, text: string) {
	const items = await openNotifications(actor)
	await expect(items.filter({ hasText: text })).toHaveCount(0, { timeout: FEED_TIMEOUT })
}

async function expectUnreadBadge(actor: DotcomActor, count: number) {
	await actor.editor.ensureSidebarOpen()
	const badge = notificationsButton(actor.page).locator(`[aria-label="${count} unread"]`)
	await expect(badge).toBeVisible({ timeout: FEED_TIMEOUT })
}

test.describe('comment notifications', () => {
	test('a comment on your home board shows up, and leaves when deleted', async ({
		owner,
		member,
		scenario,
	}) => {
		const file = await scenario.createSharedFile(owner, 'edit', scenario.name('home board'))
		await member.goto(file.sharedUrl)
		const text = scenario.name('home board comment')
		const posted = await postComment(member, text)

		await expectUnreadBadge(owner, 1)
		await expectNotification(owner, text, /commented on your board/)
		await closeNotifications(owner)

		// the badge is there on a cold load too, before any feed change arrives
		await owner.goto(file.url)
		await expectUnreadBadge(owner, 1)

		await softDelete(member, posted.commentId)
		await expectNoNotification(owner, text)
	})

	test('replies in a workspace thread notify both sides, until access is lost', async ({
		owner,
		member,
		scenario,
	}) => {
		const workspace = await scenario.createWorkspaceWithMember({ owner, member })
		const fileUrl = owner.page.url()
		await member.goto(fileUrl)

		const root = await postComment(owner, scenario.name('ws root'))
		await waitForRecord(member, root.threadId)
		const memberReply = scenario.name('ws reply by member')
		await postComment(member, memberReply, { threadId: root.threadId })
		await expectNotification(owner, memberReply, /replied/)
		await closeNotifications(owner)

		const ownerReply = scenario.name('ws reply by owner')
		await postComment(owner, ownerReply, { threadId: root.threadId })
		await expectNotification(member, ownerReply, /replied/)
		await closeNotifications(member)

		// removal only drops the ex-member's file_state for unshared files (migration 023), so unshare
		// first; then the group_user delete takes the last access row the feed's gate can find.
		// Asserted live, without a reload: a remounted app starts with empty feeds, which would
		// satisfy the count before the gate had been applied
		await scenario.setSharedLinkType(owner, 'no-access')
		await owner.page.keyboard.press('Escape')
		// the removal trigger reads file.shared, so the unshare has to reach Postgres first
		await expect
			.poll(
				() =>
					member.page.evaluate(
						(fileId) => (window as any).app.getFile(fileId)?.shared,
						root.fileId
					),
				{ timeout: FEED_TIMEOUT }
			)
			.toBe(false)
		await scenario.removeWorkspaceMember({
			owner,
			workspaceName: workspace.workspaceName,
			memberUserId: workspace.memberUserId,
		})
		await expectNoNotification(member, ownerReply)
	})

	test('a soft-deleted board takes its notifications with it', async ({
		owner,
		member,
		scenario,
	}) => {
		const file = await scenario.createSharedFile(owner, 'edit', scenario.name('doomed board'))
		await member.goto(file.sharedUrl)
		const text = scenario.name('doomed comment')
		const posted = await postComment(member, text)
		await expectNotification(owner, text, /commented on your board/)
		await closeNotifications(owner)

		// deleting the file soft-deletes it and the trigger removes its file_state/group_file rows
		await owner.page.evaluate(
			(fileId) => (window as any).app.deleteOrForgetFile(fileId),
			posted.fileId
		)
		await expectNoNotification(owner, text)
	})

	test('a mention reaches the mentioned user only on a board they can access', async ({
		owner,
		member,
		scenario,
	}) => {
		const memberId = await userIdOf(member)

		// a board the member has never opened: no file_state, no membership, so no notification
		await scenario.createPersonalFile(owner, scenario.name('private board'))
		const hidden = scenario.name('hidden mention')
		await postComment(owner, hidden, { mentionUserId: memberId })

		const file = await scenario.createSharedFile(owner, 'edit', scenario.name('mention board'))
		await member.goto(file.sharedUrl)
		await owner.goto(file.url)
		const visible = scenario.name('visible mention')
		await postComment(owner, visible, { mentionUserId: memberId })

		await expectNotification(member, visible, /mentioned you/)
		await expectNoNotification(member, hidden)
	})

	test('a comment in several feeds shows up once', async ({ owner, member, scenario }) => {
		const file = await scenario.createSharedFile(owner, 'edit', scenario.name('dedupe board'))
		await member.goto(file.sharedUrl)
		const text = scenario.name('home board mention')
		const posted = await postComment(member, text, { mentionUserId: await userIdOf(owner) })

		// both feeds have delivered it, so a missing dedupe would show by now
		await expect
			.poll(
				() =>
					owner.page.evaluate(
						(commentId) =>
							[(window as any).app.homeBoardComments$, (window as any).app.mentionComments$].every(
								(feed) => feed.get().some((c: any) => c.id === commentId)
							),
						posted.commentId
					),
				{ timeout: FEED_TIMEOUT }
			)
			.toBe(true)
		await expectNotification(owner, text, /mentioned you/)
		await expect((await openNotifications(owner)).filter({ hasText: text })).toHaveCount(1)
		await closeNotifications(owner)
		await expectUnreadBadge(owner, 1)
	})

	test('a reaction to your comment shows up in the feed', async ({ owner, member, scenario }) => {
		const file = await scenario.createSharedFile(owner, 'edit', scenario.name('reaction board'))
		const text = scenario.name('reacted comment')
		const posted = await postComment(owner, text)
		await member.goto(file.sharedUrl)
		await waitForRecord(member, posted.commentId)
		await react(member, posted, '👍')

		const item = await expectNotification(owner, text, /reacted to your comment/)
		await expect(item).toContainText('👍')
	})
})
