import { expect, test } from './fixtures/tla-test'

// Don't use stored credentials
test.use({ storageState: { cookies: [], origins: [] } })

test('can login', async ({ page, homePage }) => {
	expect(homePage.signInButton).toBeVisible()
	await homePage.login()
	await expect(page.getByTestId('tla-sidebar-toggle')).toBeVisible()
})
