import test, { Page, expect } from '@playwright/test'

async function openScene(page: Page, scene: string) {
	await page.goto(`http://localhost:5420/sync-permissions/full?scene=${scene}`)
	await expect(page.locator('.perm-panel').first()).toBeVisible()
	// Every user's editor has connected and loaded.
	await expect(page.locator('.perm-canvas')).toHaveCount(await page.locator('.perm-panel').count())
}

const panel = (page: Page, i: number) => page.locator('.perm-panel').nth(i)
const card = (page: Page, i: number, id: string) =>
	panel(page, i).locator(`[data-shape-id="shape:${id}"]`)

test.describe('Sync permissions', () => {
	test('poker: each player sees only their own faces until they show them', async ({ page }) => {
		await openScene(page, 'poker')
		// Pia's own card shows its face to Pia, and its back to Pete.
		await expect(card(page, 0, 'card-pia-0')).toContainText('only you see this')
		await expect(card(page, 1, 'card-pia-0')).toContainText('hidden')

		await page.getByRole('button', { name: "Pete peeks at Pia's card" }).click()
		await expect(page.locator('.perm-log')).toContainText('only the owner shows a card')
		await expect(card(page, 1, 'card-pia-0')).toContainText('hidden')

		await page.getByRole('button', { name: 'Pia shows her cards' }).click()
		await expect(card(page, 1, 'card-pia-0')).toContainText('face up')
	})

	test('push rejection: the server undoes all of a push it rejects', async ({ page }) => {
		await openScene(page, 'push-rejection')
		await page.getByRole('button', { name: 'push', exact: true }).click()
		await expect(page.locator('.perm-canvas')).toHaveCount(2)
		await expect(panel(page, 1).locator('.perm-holds')).toHaveText('2 shapes · Page 1')

		await page.getByRole('button', { name: 'Bob groups the boxes' }).click()
		await expect(page.locator('.perm-log')).toContainText('only Alice makes groups')
		// The boxes are still there, and not in a group, for both users.
		for (const i of [0, 1]) {
			await expect(panel(page, i).locator('.perm-holds')).toHaveText('2 shapes · Page 1')
			await expect(panel(page, i).locator('[data-shape-id="shape:a"]')).toBeVisible()
		}
	})

	test('push rejection: with client checks on, the editor rolls back the whole group', async ({
		page,
	}) => {
		await openScene(page, 'push-rejection')
		await page.getByLabel('Client checks').check()
		await page.getByRole('button', { name: 'Bob groups the boxes' }).click()
		for (const i of [0, 1]) {
			await expect(panel(page, i).locator('.perm-holds')).toHaveText('2 shapes · Page 1')
			await expect(panel(page, i).locator('[data-shape-id="shape:a"]')).toBeVisible()
		}
	})

	test('reveal steps: a step and its content show when only the frame changes', async ({
		page,
	}) => {
		await openScene(page, 'reveal-steps')
		await expect(panel(page, 1).locator('.perm-holds')).toHaveText('2 shapes · Page 1')
		await page.getByRole('button', { name: 'Reveal next step' }).click()
		await expect(panel(page, 1).locator('.perm-holds')).toHaveText('4 shapes · Page 1')
		await page.getByRole('button', { name: 'Reset', exact: true }).click()
		await expect(panel(page, 1).locator('.perm-holds')).toHaveText('2 shapes · Page 1')
	})

	test('team pages: shapes follow their page in and out of view, with no reconnect', async ({
		page,
	}) => {
		await openScene(page, 'team-pages')
		const cal = panel(page, 1).locator('.perm-holds')
		await expect(cal).toHaveText('1 shape · Brief')
		const toggle = page.getByLabel(/Internal is team only/)
		await toggle.uncheck()
		await expect(cal).toHaveText('3 shapes · Brief, Internal')
		await toggle.check()
		await expect(cal).toHaveText('1 shape · Brief')
	})

	test('classroom sections: the client runs the server rule on the new parent, and logs why', async ({
		page,
		isMobile,
	}) => {
		// The phone layout puts the canvases below the fold, too small to drag in
		test.skip(isMobile, 'needs the desktop layout')
		await openScene(page, 'classroom-sections')
		const sam = panel(page, 1)
		const note = sam.locator('[data-shape-id="shape:na"]')
		const box = (await note.boundingBox())!
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
		await page.mouse.down()
		await page.mouse.move(box.x + box.width / 2, box.y + box.height * 3, { steps: 10 })
		await page.mouse.up()
		// The rule that the server runs refuses the move to the page in Sam's own editor, with the
		// real new parent. So the write never reaches the server.
		const log = page.locator('.perm-log')
		await expect(log).toContainText('outside your section', { timeout: 5000 })
		await expect(log.locator('.perm-side--client').first()).toBeVisible()
		await expect(log.locator('.perm-side--server')).toHaveCount(0)
	})

	test('share link: a guest reconnects with the access the link gives', async ({ page }) => {
		await openScene(page, 'share-link')
		await expect(panel(page, 1)).toContainText('read only')
		await page.getByRole('button', { name: 'none', exact: true }).click()
		await expect(panel(page, 1)).toContainText('No access')
		await page.getByRole('button', { name: 'edit', exact: true }).click()
		await expect(panel(page, 1)).toContainText('can edit')
	})
})
