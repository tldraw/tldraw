import type { Locator, Page } from '@playwright/test'
import { expect, test } from '../fixtures/scenario-test'
import type { DotcomActor } from '../fixtures/scenario-test'

// Version history scenarios. Versions are written by the file room's throttled persist (every ~8s),
// so each test waits on the history API for the version it needs rather than sleeping.
//
// Every edit in a test lands inside one editing session (sessions split after 30 idle minutes), so
// an older version would not be selectable in the panel. A named version is always a session of its
// own, so tests name the past state they want to pick.
test.describe.configure({ mode: 'parallel', timeout: 120_000 })

const PERSIST_TIMEOUT = 30_000

const fileIdOf = (page: Page) => new URL(page.url()).pathname.split('/')[2]

async function historyApi(page: Page, fileId: string) {
	return page.evaluate(async (fileId) => {
		const res = await fetch(`/api/f/${fileId}/history?v=2`)
		return res.ok ? await res.json() : null
	}, fileId)
}

/** Adds a shape and waits until the history counts every shape on the page as added. */
async function addShapeAndPersist(actor: DotcomActor, fileId: string) {
	const shapeCount = await actor.page.evaluate(() => {
		const editor = (window as any).editor
		editor.createShape({ type: 'geo', x: 100 + Math.random() * 400, y: 200 })
		return editor.getCurrentPageShapes().length
	})
	await expect
		.poll(
			async () => {
				const sessions = (await historyApi(actor.page, fileId))?.sessions ?? []
				return sessions.reduce((n: number, s: any) => n + s.added - s.removed, 0)
			},
			{ timeout: PERSIST_TIMEOUT }
		)
		.toBeGreaterThanOrEqual(shapeCount)
}

async function nameLatestVersion(page: Page, fileId: string, name: string) {
	const res = await page.evaluate(
		async ({ fileId, name }) =>
			(
				await fetch(`/api/f/${fileId}/history/name`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name }),
				})
			).status,
		{ fileId, name }
	)
	expect(res).toBe(200)
}

async function openFile(actor: DotcomActor) {
	await actor.waitForFileRoomConnected()
	// A freshly created file swaps in a new editor right after it connects; edits made to the
	// first one are lost.
	await expect
		.poll(() =>
			actor.page.evaluate(async () => {
				const editor = (window as any).editor
				await new Promise((r) => setTimeout(r, 1000))
				return !!editor && editor === (window as any).editor
			})
		)
		.toBe(true)
	return fileIdOf(actor.page)
}

async function openHistory(page: Page) {
	await page.getByTestId('tla-main-menu').click()
	await page.getByRole('menuitem', { name: 'File' }).click()
	await page.getByRole('menuitem', { name: 'Show version history' }).click()
	await expect(page).toHaveURL(/\/history$/)
	await expect(historyPanel(page)).toBeVisible()
}

// The live editor stays mounted under the preview, so page-wide shape counts include both.
const previewShapes = (page: Page) => page.getByTestId('tla-version-history').locator('.tl-shape')

const historyPanel = (page: Page) =>
	page.locator('.tlui-cmt-list').filter({ hasText: 'Version history' })

const versionRow = (page: Page, text: string | RegExp): Locator =>
	historyPanel(page).locator('.tlui-cmt-list__item').filter({ hasText: text })

async function toggleHistoryOption(page: Page, label: string) {
	await page.getByRole('button', { name: 'History options' }).click()
	await page.getByRole('menuitemcheckbox', { name: label }).click()
	await page.keyboard.press('Escape')
}

const toast = (page: Page, text: string | RegExp) =>
	page.locator('.tlui-toast__title').filter({ hasText: text })

const commentThreadIds = (page: Page) =>
	page.evaluate(() =>
		(window as any).editor.store
			.allRecords()
			.filter((r: any) => r.typeName === 'comment-thread' && !r.isDeleted)
			.map((r: any) => r.id)
	)

async function postCommentThread(actor: DotcomActor) {
	return actor.page.evaluate(() => {
		const editor = (window as any).editor
		const app = (window as any).app
		const pageId = editor.getCurrentPageId()
		const now = Date.now()
		const threadId = `comment-thread:${crypto.randomUUID()}`
		editor.store.put([
			{
				id: threadId,
				typeName: 'comment-thread',
				pageId,
				anchor: { type: 'point', x: 100, y: 100 },
				createdBy: app.userId,
				createdAt: now,
				resolved: null,
				isDeleted: false,
				meta: {},
			},
			{
				id: `comment:${crypto.randomUUID()}`,
				typeName: 'comment',
				threadId,
				pageId,
				authorId: app.userId,
				createdAt: now,
				editedAt: null,
				body: {
					type: 'doc',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
				},
				isDeleted: false,
				meta: {},
			},
		])
		return threadId
	})
}

test.describe('version history', () => {
	test('opens from the File menu, previews a version, and closes without a reload', async ({
		owner,
		scenario,
	}) => {
		await scenario.createPersonalFile(owner, scenario.name('history open'))
		const fileId = await openFile(owner)
		await addShapeAndPersist(owner, fileId)
		await nameLatestVersion(owner.page, fileId, 'One shape')
		await addShapeAndPersist(owner, fileId)
		await owner.page.evaluate(() => ((window as any).__sameDocument = true))

		await openHistory(owner.page)
		await versionRow(owner.page, 'One shape').click()
		await expect(previewShapes(owner.page)).toHaveCount(1)
		await versionRow(owner.page, 'Current version').click()
		await expect(previewShapes(owner.page)).toHaveCount(2)

		await owner.page.getByTestId('tla-version-history-close').click()
		await expect(owner.page).toHaveURL(new RegExp(`/f/${fileId}$`))
		await expect(historyPanel(owner.page)).not.toBeVisible()
		await owner.editor.expectShapesCount(2)
		expect(await owner.page.evaluate(() => (window as any).__sameDocument)).toBe(true)
	})

	test('saves a named version and filters to named versions', async ({ owner, scenario }) => {
		await scenario.createPersonalFile(owner, scenario.name('history named'))
		const fileId = await openFile(owner)
		await addShapeAndPersist(owner, fileId)

		await openHistory(owner.page)
		await owner.page.getByRole('button', { name: 'Save version' }).click()
		await owner.page.getByPlaceholder('Before the client review').fill('Milestone')
		await owner.page.getByRole('button', { name: 'Save', exact: true }).click()
		await expect(toast(owner.page, 'Version saved')).toBeVisible()
		await expect(versionRow(owner.page, 'Milestone')).toBeVisible()

		// Saving again with no edits keeps the first name rather than overwriting it.
		await owner.page.getByRole('button', { name: 'Save version' }).click()
		await owner.page.getByPlaceholder('Before the client review').fill('Renamed')
		await owner.page.getByRole('button', { name: 'Save', exact: true }).click()
		await expect(toast(owner.page, 'Nothing changed since “Milestone”')).toBeVisible()
		await expect(versionRow(owner.page, 'Renamed')).toHaveCount(0)

		// Close the panel to clear the toasts, then add an unnamed version on top.
		await owner.page.getByTestId('tla-version-history-close').click()
		await addShapeAndPersist(owner, fileId)
		await openHistory(owner.page)
		await expect(versionRow(owner.page, 'Milestone')).toBeVisible()

		// Leaves the current version and the one named version.
		await toggleHistoryOption(owner.page, 'Only named versions')
		await expect(historyPanel(owner.page).locator('.tlui-cmt-list__item')).toHaveCount(2)
		await expect(versionRow(owner.page, 'Milestone')).toBeVisible()
	})

	test('only my changes hides sessions other people edited', async ({
		owner,
		member,
		scenario,
	}) => {
		await scenario.createGuestFile({
			owner,
			guest: member,
			linkType: 'edit',
			fileName: scenario.name('history mine'),
		})
		const fileId = await openFile(owner)
		await openFile(member)

		// Naming a version ends its session, which keeps the owner's file setup out of the member's
		// session and the member's edit out of the owner's next one.
		await addShapeAndPersist(owner, fileId)
		await nameLatestVersion(owner.page, fileId, 'Owner start')
		await addShapeAndPersist(member, fileId)
		await nameLatestVersion(owner.page, fileId, 'Member edit')
		await addShapeAndPersist(owner, fileId)

		await openHistory(owner.page)
		await expect(versionRow(owner.page, 'Member edit')).toBeVisible()

		await toggleHistoryOption(owner.page, 'Only my changes')
		await expect(versionRow(owner.page, 'Member edit')).toHaveCount(0)
		await expect(versionRow(owner.page, 'You').first()).toBeVisible()
	})

	test('restore reaches every client, and undo brings back shapes and comments', async ({
		owner,
		member,
		scenario,
	}) => {
		await scenario.createGuestFile({
			owner,
			guest: member,
			linkType: 'edit',
			fileName: scenario.name('history restore'),
		})
		const fileId = await openFile(owner)
		await openFile(member)

		await addShapeAndPersist(owner, fileId)
		await nameLatestVersion(owner.page, fileId, 'Before the comment')
		const threadId = await postCommentThread(owner)
		await addShapeAndPersist(owner, fileId)
		await member.editor.expectShapesCount(2)
		await expect.poll(() => commentThreadIds(member.page)).toEqual([threadId])

		await openHistory(owner.page)
		await versionRow(owner.page, 'Before the comment').click()
		await owner.page.getByRole('button', { name: 'Restore this version' }).click()
		await expect(owner.page.getByText('1 comment thread will be removed.')).toBeVisible()
		await owner.page.getByRole('button', { name: 'Restore', exact: true }).click()
		await expect(owner.page).toHaveURL(new RegExp(`/f/${fileId}$`))

		for (const actor of [owner, member]) {
			await actor.editor.expectShapesCount(1, 15_000)
			await expect.poll(() => commentThreadIds(actor.page)).toEqual([])
			await expect(toast(actor.page, /restored “Before the comment”/)).toBeVisible()
		}

		// The other editor undoes it from their own toast.
		await member.page
			.locator('.tlui-toast__container')
			.getByRole('button', { name: 'Undo', exact: true })
			.click()
		for (const actor of [owner, member]) {
			await actor.editor.expectShapesCount(2, 15_000)
			await expect.poll(() => commentThreadIds(actor.page)).toEqual([threadId])
		}
	})

	test('duplicates a past version into a new file', async ({ owner, scenario }) => {
		const { fileName } = await scenario.createPersonalFile(owner, scenario.name('history dup'))
		const fileId = await openFile(owner)
		await addShapeAndPersist(owner, fileId)
		await nameLatestVersion(owner.page, fileId, 'One shape')
		await addShapeAndPersist(owner, fileId)

		await openHistory(owner.page)
		await versionRow(owner.page, 'One shape').click()
		await owner.page.getByRole('button', { name: 'Duplicate this version' }).click()

		await expect(owner.page).not.toHaveURL(new RegExp(`/f/${fileId}`))
		await owner.waitForFileRoomConnected()
		await owner.editor.expectShapesCount(1, 15_000)
		expect(await owner.editor.getCurrentFileName()).toContain(fileName)
	})
})
