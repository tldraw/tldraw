import { expect, test } from './fixtures/test-fixtures'

test.describe('User Profile', () => {
	test('should load profile page and display user data', async ({
		authenticatedPage,
		testUser,
	}) => {
		const page = authenticatedPage

		// Navigate to profile page
		await page.goto('/profile')

		// Wait for profile form to load
		await page.waitForSelector('[data-testid="email-input"]')

		// Email should be read-only and populated
		const emailInput = page.locator('[data-testid="email-input"]')
		await expect(emailInput).toBeDisabled()
		await expect(emailInput).toHaveValue(testUser.email)

		// Name and display name should be editable
		const nameInput = page.locator('[data-testid="name-input"]')
		await expect(nameInput).toBeEnabled()

		const displayNameInput = page.locator('[data-testid="display-name-input"]')
		await expect(displayNameInput).toBeEnabled()
	})

	test('should update display name and reflect in dashboard', async ({
		authenticatedPage,
		testUser,
	}) => {
		const page = authenticatedPage
		const newDisplayName = 'Updated Display Name'

		// Navigate to profile page
		await page.goto('/profile')
		await page.waitForSelector('[data-testid="display-name-input"]')

		// Get current name value to keep it unchanged
		const nameInput = page.locator('[data-testid="name-input"]')
		const currentName = await nameInput.inputValue()

		// Update display name
		await page.fill('[data-testid="display-name-input"]', newDisplayName)
		await page.click('[data-testid="save-button"]')

		// Should show success message
		const successMessage = page.locator('[data-testid="success-message"]')
		await expect(successMessage).toBeVisible()
		await expect(successMessage).toContainText('Profile updated successfully')

		// Navigate back to dashboard
		await page.click('text=Back to Dashboard')
		await page.waitForURL('**/dashboard**')

		// Wait for dashboard to load profile data
		await page.waitForTimeout(1000)

		// Dashboard should show the updated display name
		const welcomeText = page.locator('h2:has-text("Welcome")')
		await expect(welcomeText).toContainText(newDisplayName)

		// Verify profile still has updated values after navigation
		await page.goto('/profile')
		await page.waitForSelector('[data-testid="display-name-input"]')

		const displayNameInput = page.locator('[data-testid="display-name-input"]')
		await expect(displayNameInput).toHaveValue(newDisplayName)
	})

	test('should validate empty display name', async ({ authenticatedPage }) => {
		const page = authenticatedPage

		await page.goto('/profile')
		await page.waitForSelector('[data-testid="display-name-input"]')

		// Try to clear display name
		await page.fill('[data-testid="display-name-input"]', '')

		// Form validation should prevent submission
		const displayNameInput = page.locator('[data-testid="display-name-input"]')
		const validationMessage = await displayNameInput.evaluate(
			(el: HTMLInputElement) => el.validationMessage
		)
		expect(validationMessage).toBeTruthy()
	})

	test('should validate max length for display name', async ({ authenticatedPage }) => {
		const page = authenticatedPage

		await page.goto('/profile')
		await page.waitForSelector('[data-testid="display-name-input"]')

		// Try to enter a very long display name (>100 characters)
		const longName = 'A'.repeat(150)
		await page.fill('[data-testid="display-name-input"]', longName)

		// Input should truncate to maxLength
		const displayNameInput = page.locator('[data-testid="display-name-input"]')
		const actualValue = await displayNameInput.inputValue()
		expect(actualValue.length).toBeLessThanOrEqual(100)
	})

	test('should validate empty name', async ({ authenticatedPage }) => {
		const page = authenticatedPage

		await page.goto('/profile')
		await page.waitForSelector('[data-testid="name-input"]')

		// Try to clear name
		await page.fill('[data-testid="name-input"]', '')

		// Form validation should prevent submission
		const nameInput = page.locator('[data-testid="name-input"]')
		const validationMessage = await nameInput.evaluate(
			(el: HTMLInputElement) => el.validationMessage
		)
		expect(validationMessage).toBeTruthy()
	})

	test('should persist profile after page refresh', async ({ authenticatedPage }) => {
		const page = authenticatedPage
		const newName = 'Refreshed Name'
		const newDisplayName = 'Refreshed Display'

		// Update profile
		await page.goto('/profile')
		await page.waitForSelector('[data-testid="name-input"]')

		await page.fill('[data-testid="name-input"]', newName)
		await page.fill('[data-testid="display-name-input"]', newDisplayName)
		await page.click('[data-testid="save-button"]')

		// Wait for success
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

		// Refresh the page
		await page.reload()
		await page.waitForSelector('[data-testid="name-input"]')

		// Values should persist
		const nameInput = page.locator('[data-testid="name-input"]')
		const displayNameInput = page.locator('[data-testid="display-name-input"]')

		await expect(nameInput).toHaveValue(newName)
		await expect(displayNameInput).toHaveValue(newDisplayName)
	})

	test('should navigate between dashboard and profile', async ({ authenticatedPage }) => {
		const page = authenticatedPage

		// Should start on dashboard
		expect(page.url()).toContain('/dashboard')

		// Click profile link
		await page.click('text=Profile')
		await page.waitForURL('**/profile**')
		expect(page.url()).toContain('/profile')

		// Navigate back to dashboard
		await page.click('text=Back to Dashboard')
		await page.waitForURL('**/dashboard**')
		expect(page.url()).toContain('/dashboard')
	})
})
