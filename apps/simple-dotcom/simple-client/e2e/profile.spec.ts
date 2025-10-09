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

	test('should update display name and reflect in dashboard', async ({ authenticatedPage }) => {
		const page = authenticatedPage
		const newDisplayName = 'Updated Display Name'

		// Navigate to profile page
		await page.goto('/profile')
		await page.waitForSelector('[data-testid="display-name-input"]')

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

		// Dashboard should show the updated display name
		const welcomeText = page.locator('h2:has-text("Welcome")')
		await expect(welcomeText).toContainText(newDisplayName)

		// Verify profile still has updated values after navigation
		await page.goto('/profile')
		await page.waitForSelector('[data-testid="display-name-input"]')

		const displayNameInput = page.locator('[data-testid="display-name-input"]')
		await expect(displayNameInput).toHaveValue(newDisplayName)
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

	test('should show unsaved changes indicator when fields are modified', async ({
		authenticatedPage,
	}) => {
		const page = authenticatedPage

		await page.goto('/profile')
		await page.waitForSelector('[data-testid="name-input"]')

		// Initially, no unsaved changes indicator
		await expect(page.locator('[data-testid="unsaved-changes-indicator"]')).not.toBeVisible()

		// Make a change
		await page.fill('[data-testid="name-input"]', 'Modified Name')

		// Unsaved changes indicator should appear
		await expect(page.locator('[data-testid="unsaved-changes-indicator"]')).toBeVisible()
		await expect(page.locator('[data-testid="unsaved-changes-indicator"]')).toContainText(
			'Unsaved changes'
		)
	})

	test('should hide unsaved changes indicator after successful save', async ({
		authenticatedPage,
	}) => {
		const page = authenticatedPage

		await page.goto('/profile')
		await page.waitForSelector('[data-testid="name-input"]')

		// Make a change
		await page.fill('[data-testid="name-input"]', 'Updated Name')

		// Verify indicator is shown
		await expect(page.locator('[data-testid="unsaved-changes-indicator"]')).toBeVisible()

		// Save changes
		await page.click('[data-testid="save-button"]')
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

		// Indicator should be hidden after save
		await expect(page.locator('[data-testid="unsaved-changes-indicator"]')).not.toBeVisible()
	})
})
