import test, { Page, expect } from '@playwright/test'

async function openScene(page: Page, scene: string) {
	await page.goto(`http://localhost:5420/sync-permissions/full?scene=${scene}`)
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

	test('share link: a guest reconnects with the access the link gives', async ({ page }) => {
		await openScene(page, 'share-link')
		await expect(panel(page, 1)).toContainText('read only')
		await page.getByRole('button', { name: 'none', exact: true }).click()
		await expect(panel(page, 1)).toContainText('No access')
		await page.getByRole('button', { name: 'edit', exact: true }).click()
		await expect(panel(page, 1)).toContainText('can edit')
	})
})
