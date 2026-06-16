import { expect, test } from '../fixtures/scenario-test'

test.describe.configure({ mode: 'parallel' })

test.describe('legacy routes', () => {
	test('signed-out visitors can view legacy room routes', async ({ actors, scenario }) => {
		const owner = await actors.open('owner', { goto: false })
		const fixture = await scenario.createLegacyRouteFixture(owner)
		const visitor = await actors.open('visitor', { goto: false })

		for (const url of [fixture.urls.room, fixture.urls.readonly, fixture.urls.legacyReadonly]) {
			await visitor.goto(url)
			await expect(visitor.page.getByTestId('tla-sign-in-button')).toBeVisible()
			await expect(visitor.page.getByTestId('tla-sidebar-layout')).toHaveCount(0)
		}
	})

	test('signed-in actors can open legacy rooms with copy affordance', async ({
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
	})

	test('signed-in actors can open legacy readonly rooms with copy affordance', async ({
		actors,
		scenario,
	}) => {
		const owner = await actors.open('owner', { goto: false })
		const fixture = await scenario.createLegacyRouteFixture(owner)

		for (const url of [fixture.urls.readonly, fixture.urls.legacyReadonly]) {
			await owner.goto(url)
			await owner.expectReadonly(true)
			await expect(owner.page.getByTestId('tla-sidebar-layout')).toBeVisible()
			await expect(owner.page.getByTestId('tla-import-button')).toBeVisible()
		}
	})

	test('legacy snapshots load for signed-out and signed-in actors', async ({
		actors,
		scenario,
	}) => {
		const owner = await actors.open('owner', { goto: false })
		const fixture = await scenario.createLegacyRouteFixture(owner)
		const visitor = await actors.open('visitor', { goto: false })

		await visitor.goto(fixture.urls.snapshot)
		await expect(visitor.page.getByTestId('tla-sign-in-button')).toBeVisible()
		await expect(visitor.page.getByTestId('tla-editor')).toBeVisible()

		await owner.goto(fixture.urls.snapshot)
		await expect(owner.page.getByTestId('tla-import-button')).toBeVisible()
		await expect(owner.page.getByTestId('tla-sidebar-layout')).toBeVisible()
	})

	test('legacy history routes load seeded versions', async ({ actors, scenario }) => {
		const owner = await actors.open('owner', { goto: false })
		const fixture = await scenario.createLegacyRouteFixture(owner)
		const visitor = await actors.open('visitor', { goto: false })

		await visitor.page.goto(fixture.urls.history, { waitUntil: 'load' })
		await expect(visitor.page.getByRole('heading', { name: 'Board history' })).toBeVisible()
		await expect
			.poll(async () => await visitor.page.locator('.board-history').getByRole('link').count())
			.toBeGreaterThan(0)

		await visitor.page.goto(fixture.urls.historySnapshot, { waitUntil: 'load' })
		await visitor.homePage.isLoaded()
		await expect(visitor.page.getByRole('button', { name: 'Restore version' })).toBeVisible()
	})
})
