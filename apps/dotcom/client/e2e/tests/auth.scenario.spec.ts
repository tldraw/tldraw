import { expect, test } from '../fixtures/scenario-test'

// Signed-out dialog scenarios.
test.describe.configure({ mode: 'parallel' })

test.describe('auth dialog scenarios', () => {
	test('visitor cannot submit an empty or malformed email, and can close the sign-in dialog', async ({
		visitor,
	}) => {
		await visitor.goto()
		await visitor.homePage.expectSignInButtonVisible()
		await visitor.homePage.signInButton.click()
		await visitor.signInDialog.expectInitialElements()

		await visitor.signInDialog.continueWithEmailButton.click()
		await expect(visitor.signInDialog.emailInput).toBeVisible()
		await expect(visitor.signInDialog.codeInput).not.toBeVisible()

		await visitor.signInDialog.emailInput.fill('not-an-email')
		await visitor.signInDialog.continueWithEmailButton.click()
		await expect(visitor.signInDialog.emailInput).toBeVisible()
		await expect(visitor.signInDialog.codeInput).not.toBeVisible()

		await visitor.signInDialog.emailInput.fill('partial@example.com')
		await visitor.page.keyboard.press('Escape')

		await expect(visitor.signInDialog.emailInput).not.toBeVisible()
		await visitor.homePage.expectSignInButtonVisible()
	})
})
