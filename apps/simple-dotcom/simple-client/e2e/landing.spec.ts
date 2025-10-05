import { expect, test } from './fixtures/test-fixtures'

test.describe('Landing Page', () => {
	test('should display landing page with auth buttons', async ({ browser }) => {
		// Use a fresh browser context without authentication
		const context = await browser.newContext()
		const page = await context.newPage()

		await page.goto('/')

		// Verify landing page content
		await expect(page.locator('text=Welcome to Simple Dotcom')).toBeVisible()
		await expect(
			page.locator('text=A collaborative workspace for your documents and ideas')
		).toBeVisible()

		// Verify auth buttons are present
		await expect(page.locator('[data-testid="signup-link"]')).toBeVisible()
		await expect(page.locator('[data-testid="login-link"]')).toBeVisible()

		await context.close()
	})

	test('should navigate to signup page when clicking Sign up button', async ({ browser }) => {
		const context = await browser.newContext()
		const page = await context.newPage()

		await page.goto('/')

		// Click the Sign up button
		await page.click('[data-testid="signup-link"]')

		// Verify navigation to signup page
		await page.waitForURL('**/signup**')
		expect(page.url()).toContain('/signup')

		await context.close()
	})

	test('should navigate to login page when clicking Log in button', async ({ browser }) => {
		const context = await browser.newContext()
		const page = await context.newPage()

		await page.goto('/')

		// Click the Log in button
		await page.click('[data-testid="login-link"]')

		// Verify navigation to login page
		await page.waitForURL('**/login**')
		expect(page.url()).toContain('/login')

		await context.close()
	})

	test('should redirect authenticated users to dashboard', async ({ authenticatedPage }) => {
		// Using the authenticatedPage fixture which has a logged-in user
		await authenticatedPage.goto('/')

		// Authenticated users should be redirected to dashboard
		await authenticatedPage.waitForURL('**/dashboard**')
		expect(authenticatedPage.url()).toContain('/dashboard')
	})
})
