import { expect, test } from '../fixtures/tla-test'

// Don't use stored credentials
test.use({ storageState: { cookies: [], origins: [] } })

test('can login', async ({ homePage, editor }) => {
	expect(homePage.signInButton).toBeVisible()
	await homePage.login()
	await expect(homePage.signInButton).not.toBeVisible()
	await expect(editor.sidebarToggle).toBeVisible()
})

test.fixme('can visit a shared file', async () => {
	// ...
})

test.fixme('can visit a pubished file', async () => {
	// ...
})

test.fixme('can not visit an unshared file', async () => {
	// ...
})

test.fixme('can scroll down to see landing page content', async () => {
	// ...
})

test.fixme('can export images', async () => {
	// ...
})

test.fixme('when visiting a shared file, can copy the shared file link', async () => {
	// ...
})

test.fixme('when visiting a published file, can copy the published file link', async () => {
	// ...
})
