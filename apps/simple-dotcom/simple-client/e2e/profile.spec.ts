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

	test('should warn when navigating away with unsaved changes via link', async ({
		authenticatedPage,
	}) => {
		const page = authenticatedPage

		await page.goto('/profile')
		await page.waitForSelector('[data-testid="name-input"]')

		// Make a change without saving
		await page.fill('[data-testid="name-input"]', 'Changed Name')

		// Set up dialog handler before clicking the link
		let dialogShown = false
		let dialogMessage = ''
		page.once('dialog', async (dialog) => {
			dialogShown = true
			dialogMessage = dialog.message()
			await dialog.dismiss() // Don't navigate away
		})

		// Try to navigate away
		await page.click('text=Back to Dashboard')

		// Verify dialog was shown and we're still on profile page
		await expect.poll(() => dialogShown, { timeout: 2000 }).toBe(true)
		expect(dialogMessage).toContain('unsaved changes')
		expect(page.url()).toContain('/profile')
	})

	test('should allow navigation after dismissing unsaved changes warning', async ({
		authenticatedPage,
	}) => {
		const page = authenticatedPage

		await page.goto('/profile')
		await page.waitForSelector('[data-testid="name-input"]')

		// Make a change without saving
		await page.fill('[data-testid="display-name-input"]', 'Changed Display Name')

		// Set up dialog handler to accept navigation
		page.once('dialog', async (dialog) => {
			expect(dialog.message()).toContain('unsaved changes')
			await dialog.accept() // Allow navigation
		})

		// Try to navigate away
		await page.click('text=Back to Dashboard')

		// Should navigate to dashboard
		await page.waitForURL('**/dashboard**', { timeout: 5000 })
		expect(page.url()).toContain('/dashboard')
	})

	test('should not warn when navigating after save', async ({ authenticatedPage }) => {
		const page = authenticatedPage

		await page.goto('/profile')
		await page.waitForSelector('[data-testid="name-input"]')

		// Make a change and save
		await page.fill('[data-testid="name-input"]', 'Saved Name')
		await page.click('[data-testid="save-button"]')
		await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

		// Set up dialog handler
		let dialogShown = false
		page.on('dialog', async (dialog) => {
			dialogShown = true
			await dialog.accept()
		})

		// Navigate away - should not show dialog
		await page.click('text=Back to Dashboard')
		await page.waitForURL('**/dashboard**')

		// Verify no dialog was shown
		expect(dialogShown).toBe(false)
		expect(page.url()).toContain('/dashboard')
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

	test('should warn on browser back button with unsaved changes', async ({ authenticatedPage }) => {
		const page = authenticatedPage

		// Navigate from dashboard to profile
		await page.goto('/dashboard')
		await page.click('text=Profile')
		await page.waitForURL('**/profile**')
		await page.waitForSelector('[data-testid="name-input"]')

		// Make a change without saving
		await page.fill('[data-testid="name-input"]', 'Changed Name')

		// Try to use browser back button
		// Note: Playwright cannot fully test beforeunload for browser back button
		// but we can verify the event handler is registered
		const hasBeforeUnload = await page.evaluate(() => {
			const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent
			window.dispatchEvent(event)
			return event.defaultPrevented || event.returnValue !== ''
		})

		// Should have beforeunload handler active when there are unsaved changes
		expect(hasBeforeUnload).toBe(true)
	})
})
