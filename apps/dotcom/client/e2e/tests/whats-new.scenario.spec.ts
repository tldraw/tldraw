import type { WhatsNewStore } from '@tldraw/dotcom-shared'
import { expect, test } from '../fixtures/scenario-test'
import type { DotcomActor } from '../fixtures/scenario-test'

// What's new lives in one KV value shared by every test, so these run in order. The fixtures turn
// auto-open off for every context; `openReader` opens one with it on.
test.describe.configure({ mode: 'serial', timeout: 90_000 })

async function adminApi(actor: DotcomActor, path: string, body?: object): Promise<WhatsNewStore> {
	return await actor.page.evaluate(
		async ({ path, body }) => {
			const res = await fetch(
				`/api/app/admin/whats-new${path}`,
				body === undefined
					? undefined
					: {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(body),
						}
			)
			if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
			return await res.json()
		},
		{ path, body }
	)
}

async function createUpdate(admin: DotcomActor, title: string, body = 'Some **news**.') {
	const { version } = await adminApi(admin, '')
	const next = await adminApi(admin, '', { version, title, body })
	const id = next.updates.find((u) => u.title === title)!.id
	created.push({ admin, id })
	return id
}

async function setPublished(admin: DotcomActor, id: string, published: boolean) {
	const { version } = await adminApi(admin, '')
	await adminApi(admin, `/${id}/${published ? 'publish' : 'unpublish'}`, { version })
}

async function publishUpdate(admin: DotcomActor, title: string, body?: string) {
	const id = await createUpdate(admin, title, body)
	await setPublished(admin, id, true)
	return id
}

const created: { admin: DotcomActor; id: string }[] = []

test.afterEach(async () => {
	for (const { admin, id } of created.splice(0)) {
		const { version } = await adminApi(admin, '').catch(() => ({ version: -1 }))
		await adminApi(admin, `/${id}/delete`, { version }).catch(() => {})
	}
})

/** Auto-open decides right after the content fetch; the menu item appears from the same fetch. */
async function waitForWhatsNewLoaded(reader: DotcomActor) {
	await reader.editor.ensureSidebarOpen()
	await reader.sidebar.openUserSettingsMenu()
	await expect(reader.page.getByTestId('tla-whats-new-menu-item')).toBeVisible()
	await reader.page.keyboard.press('Escape')
}

function dialog(reader: DotcomActor) {
	return reader.page.getByTestId('whats-new-dialog')
}

async function openReader(actors: { open: any }) {
	const reader: DotcomActor = await actors.open('member', {
		goto: false,
		allowWhatsNewAutoOpen: true,
	})
	return reader
}

test('a draft never auto-opens', async ({ owner, actors, scenario }) => {
	await createUpdate(owner, scenario.name('draft'))
	const reader = await openReader(actors)

	await reader.goto()
	await waitForWhatsNewLoaded(reader)

	await expect(dialog(reader)).toHaveCount(0)
})

test('a published update auto-opens once and the help menu reopens it', async ({
	owner,
	actors,
	scenario,
}) => {
	const title = scenario.name('published')
	await publishUpdate(owner, title)
	const reader = await openReader(actors)

	await reader.goto()
	await expect(dialog(reader)).toContainText(title)
	await reader.page.keyboard.press('Escape')

	await reader.page.reload()
	await reader.waitForAppReady()
	await waitForWhatsNewLoaded(reader)
	await expect(dialog(reader)).toHaveCount(0)

	await reader.sidebar.openUserSettingsMenu()
	await reader.page.getByTestId('tla-whats-new-menu-item').click()
	await expect(dialog(reader)).toContainText(title)
})

test('opting out stops auto-open but shows the dot', async ({ owner, actors, scenario }) => {
	await publishUpdate(owner, scenario.name('first'))
	const reader = await openReader(actors)
	await reader.goto()
	await dialog(reader).waitFor()
	await reader.page.getByRole('checkbox', { name: 'Show this next time' }).uncheck()
	await reader.page.keyboard.press('Escape')

	const second = scenario.name('second')
	await publishUpdate(owner, second)
	await reader.page.reload()
	await reader.waitForAppReady()
	await reader.editor.ensureSidebarOpen()

	await expect(reader.page.getByTestId('whats-new-dot').first()).toBeVisible()
	await expect(dialog(reader)).toHaveCount(0)

	await reader.sidebar.openUserSettingsMenu()
	await reader.page.getByTestId('tla-whats-new-menu-item').click()
	await expect(dialog(reader)).toContainText(second)
	await reader.page.keyboard.press('Escape')
	await expect(reader.page.getByTestId('whats-new-dot')).toHaveCount(0)
})

test('a guest file visit does not auto-open, but shows the dot', async ({
	owner,
	actors,
	scenario,
}) => {
	const { sharedUrl } = await scenario.createSharedFile(owner, 'edit')
	await publishUpdate(owner, scenario.name('guest'))
	const reader = await openReader(actors)

	await reader.goto(sharedUrl)
	await reader.editor.ensureSidebarOpen()

	// The dot waits on the same fetch as auto-open, so once it shows, auto-open has decided.
	await expect(reader.page.getByTestId('whats-new-dot').first()).toBeVisible()
	await expect(dialog(reader)).toHaveCount(0)
})

test('the public page shows published updates signed out, never drafts', async ({
	owner,
	visitor,
	scenario,
}) => {
	const title = scenario.name('public')
	const draft = scenario.name('public draft')
	await publishUpdate(owner, title)
	await createUpdate(owner, draft)

	await visitor.page.goto('http://localhost:3000/whats-new')

	await expect(visitor.page.getByText(title)).toBeVisible()
	await expect(visitor.page.getByText(draft)).toHaveCount(0)
})

test('markdown renders safely: no raw html, mp4 with a query string is a video', async ({
	owner,
	actors,
	scenario,
}) => {
	await publishUpdate(
		owner,
		scenario.name('markdown'),
		'<b data-testid="raw">x</b>\n\n![](https://example.com/a.mp4?v=2)'
	)
	const reader = await openReader(actors)

	await reader.goto()

	await dialog(reader).waitFor()
	await expect(reader.page.getByTestId('raw')).toHaveCount(0)
	await expect(dialog(reader).locator('video')).toHaveCount(1)
})

test("a failing content fetch doesn't block boot", async ({ owner, actors, scenario }) => {
	await publishUpdate(owner, scenario.name('blocked'))
	const reader = await openReader(actors)
	await reader.page.route('**/api/app/whats-new**', (route) => route.abort())

	await reader.goto()
	await reader.editor.ensureSidebarOpen()

	await expect(dialog(reader)).toHaveCount(0)
	await reader.sidebar.openUserSettingsMenu()
	await expect(reader.page.getByTestId('tla-whats-new-menu-item')).toHaveCount(0)
})

test('auto-open stays off pages that are not the app, like admin', async ({
	owner,
	actors,
	scenario,
}) => {
	const title = scenario.name('off app')
	await publishUpdate(owner, title)
	const reader = await openReader(actors)

	await reader.page.goto('http://localhost:3000/admin/whats-new')
	await expect(reader.page.getByRole('cell', { name: title })).toBeVisible()
	// No in-page signal for "auto-open decided" here: give the boot fetch time to land.
	await reader.page.waitForTimeout(3000)

	await expect(dialog(reader)).toHaveCount(0)
})

test('publish is disabled while the admin form has unsaved edits', async ({ owner, scenario }) => {
	const title = scenario.name('dirty')
	await createUpdate(owner, title)

	await owner.page.goto('http://localhost:3000/admin/whats-new')
	await owner.page.getByRole('cell', { name: title }).click()
	const publish = owner.page.getByRole('button', { name: 'Publish' })
	await expect(publish).toBeEnabled()
	await owner.page.getByPlaceholder('Markdown body').fill('Edited but not saved')

	await expect(publish).toBeDisabled()
})

test('admin deletes a published update only after confirming', async ({ owner, scenario }) => {
	const title = scenario.name('to delete')
	await publishUpdate(owner, title)
	await owner.page.goto('http://localhost:3000/admin/whats-new')
	const row = owner.page.getByRole('cell', { name: title })
	await row.click()
	const del = owner.page.getByRole('button', { name: 'Delete' })

	owner.page.once('dialog', (d) => d.dismiss())
	await del.click()
	await expect(row).toBeVisible()

	owner.page.once('dialog', (d) => d.accept())
	await del.click()
	await expect(row).toHaveCount(0)
})
