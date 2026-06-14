import { USERS } from '../../consts'
import { expect, test } from '../../fixtures/tla-test'

// Don't use stored credentials
test.use({ storageState: { cookies: [], origins: [] } })

test('can login', async ({ homePage, editor }) => {
	await expect(homePage.signInButton).toBeVisible()
	const user = USERS[test.info().parallelIndex]
	await homePage.loginAs(user)
	await editor.isLoaded()
	await expect(homePage.signInButton).not.toBeVisible()
	await expect(editor.sidebarToggle).toBeVisible()
})

test('can sign out', async ({ homePage, editor, sidebar }) => {
	await test.step('Login', async () => {
		const user = USERS[test.info().parallelIndex]
		await homePage.loginAs(user)
	})
	await editor.isLoaded()
	await homePage.expectSignInButtonNotVisible()
	await editor.ensureSidebarOpen()
	await sidebar.signOut()
	await homePage.expectSignInButtonVisible()
})

test('shows anonymous SDK content', async ({ page, homePage }) => {
	await homePage.expectSignInButtonVisible()
	await expect(page.getByTestId('tla-anon-dotdev-link')).toBeVisible()

	await page.getByTestId('tla-anon-dotdev-dismiss-button').click()
	await expect(page.getByTestId('tla-anon-dotdev-link')).not.toBeVisible()
})
