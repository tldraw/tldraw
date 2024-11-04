import { expect, test } from '../fixtures/tla-test'

// Don't use stored credentials
test.use({ storageState: { cookies: [], origins: [] } })

test('can login', async ({ homePage, editor }) => {
	expect(homePage.signInButton).toBeVisible()
	await homePage.login()
	await expect(homePage.signInButton).not.toBeVisible()
	await expect(editor.sidebarToggle).toBeVisible()
})

test.fixme('can scroll down to see landing page content', async () => {
	// ...
})

test.fixme('can export images', async () => {
	// ...
})
