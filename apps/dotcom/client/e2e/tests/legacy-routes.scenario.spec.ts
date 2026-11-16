import { expect, test } from '../fixtures/scenario-test'

test.describe.configure({ mode: 'parallel' })

test.describe('legacy routes', () => {
	test('signed-out visitors can view legacy rooms and snapshots, but not history', async ({
		actors,
		scenario,
	}) => {
		const owner = await actors.open('owner', { goto: false })
		const fixture = await scenario.createLegacyRouteFixture(owner)
		const visitor = await actors.open('visitor', { goto: false })

		for (const url of [fixture.urls.room, fixture.urls.readonly, fixture.urls.legacyReadonly]) {
			await visitor.goto(url)
			await expect(visitor.page.getByTestId('tla-sign-in-button')).toBeVisible()
			await expect(visitor.page.getByTestId('tla-sidebar-layout')).toHaveCount(0)
		}

		await visitor.goto(fixture.urls.snapshot)
		await expect(visitor.page.getByTestId('tla-sign-in-button')).toBeVisible()
		await expect(visitor.page.getByTestId('tla-editor')).toBeVisible()

		// History is restricted to tldraw staff; non-staff visitors are redirected away.
		await visitor.page.goto(fixture.urls.history, { waitUntil: 'load' })
		await expect(visitor.page).not.toHaveURL(/history/)
		await expect(visitor.page.getByRole('heading', { name: 'Board history' })).toHaveCount(0)
	})

	test('signed-in actors can open legacy rooms, snapshots, and history with copy affordance', async ({
		actors,
		scenario,
	}) => {
		const owner = await actors.open('owner', { goto: false })
		const fixture = await scenario.createLegacyRouteFixture(owner)

		await owner.goto(fixture.urls.room)
		await expect(owner.page.getByText('This file is now read-only')).toBeVisible()
		await owner.page.getByTestId('dialog.close').click()
		await expect(owner.page.getByTestId('tla-import-button')).toBeVisible()
		await expect(owner.page.getByTestId('tla-sidebar-layout')).toBeVisible()

		for (const url of [fixture.urls.readonly, fixture.urls.legacyReadonly]) {
			await owner.goto(url)
			await owner.expectReadonly(true)
			await expect(owner.page.getByTestId('tla-sidebar-layout')).toBeVisible()
			await expect(owner.page.getByTestId('tla-import-button')).toBeVisible()
		}

		await owner.goto(fixture.urls.snapshot)
		await expect(owner.page.getByTestId('tla-import-button')).toBeVisible()
		await expect(owner.page.getByTestId('tla-sidebar-layout')).toBeVisible()

		// The signed-in test users use @tldraw.com emails, so the owner is staff and can load
		// history and restore versions.
		await owner.page.goto(fixture.urls.history, { waitUntil: 'load' })
		await expect(owner.page.getByRole('heading', { name: 'Board history' })).toBeVisible()
		await expect
			.poll(async () => await owner.page.locator('.board-history').getByRole('link').count())
			.toBeGreaterThan(0)

		await owner.page.goto(fixture.urls.historySnapshot, { waitUntil: 'load' })
		await owner.homePage.expectEditorVisible()
		await expect(owner.page.getByRole('button', { name: 'Restore version' })).toBeVisible()
	})
})
