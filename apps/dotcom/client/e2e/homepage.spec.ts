import { expect, test } from './fixtures/tla-test'

test('can login', async ({ page, homePage }) => {
	await homePage.login()
	await expect(page.getByTestId('tla-sidebar-toggle')).toBeVisible()
})
