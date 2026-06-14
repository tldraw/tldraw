import { USERS } from '../consts'
import { expect, test } from '../fixtures/tla-test'

// Don't use stored credentials for these dialog-specific tests
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('SignInDialog', () => {
	test('can sign in via email code using the custom dialog', async ({
		homePage,
		editor,
		signInDialog,
	}) => {
		const user = USERS[test.info().parallelIndex]

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail(user)
		await signInDialog.expectCodeStageVisible()

		await signInDialog.fillCode('424242')

		await editor.isLoaded()
		await expect(homePage.signInButton).not.toBeVisible()
		await expect(editor.sidebarToggle).toBeVisible()
	})

	test('resend is available on code stage', async ({ homePage, signInDialog }) => {
		const user = USERS[test.info().parallelIndex]

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		await signInDialog.continueWithEmail(user)
		await signInDialog.expectCodeStageVisible()
		await signInDialog.clickResend()

		// Code input should still be visible and empty after resend
		await expect(signInDialog.codeInput).toBeVisible()
	})

	// Dialog close behaviors
	test('can close dialog during code entry stage', async ({ homePage, signInDialog, page }) => {
		const user = USERS[test.info().parallelIndex]

		await homePage.expectSignInButtonVisible()
		await homePage.signInButton.click()

		// Complete email stage
		await signInDialog.continueWithEmail(user)
		await signInDialog.expectCodeStageVisible()

		// Close dialog without entering code
		await page.keyboard.press('Escape')

		// Verify dialog is closed and user remains signed out
		await expect(signInDialog.codeInput).not.toBeVisible()
		await homePage.expectSignInButtonVisible()

		// Verify user can restart flow by reopening dialog
		await homePage.signInButton.click()
		await signInDialog.expectInitialElements()
	})
})
