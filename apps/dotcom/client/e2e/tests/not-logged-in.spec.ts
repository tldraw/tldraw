import { expect, test, todo } from '../fixtures/tla-test'

// Don't use stored credentials
test.use({ storageState: { cookies: [], origins: [] } })

test('can login', async ({ homePage, editor }) => {
	expect(homePage.signInButton).toBeVisible()
	await homePage.login()
	await expect(homePage.signInButton).not.toBeVisible()
	await expect(editor.sidebarToggle).toBeVisible()
})

todo('can visit a shared file', async () => {
	// ...
})

todo('can visit a pubished file', async () => {
	// ...
})

todo('can not visit an unshared file', async () => {
	// ...
})

todo('can scroll down to see landing page content', async () => {
	// ...
})

todo('can export images', async () => {
	// ...
})

todo('when visiting a shared file, can copy the shared file link', async () => {
	// ...
})

todo('when visiting a published file, can copy the published file link', async () => {
	// ...
})
