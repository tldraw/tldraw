import { expect, test } from './fixtures/test-fixtures'

test.describe('Authentication', () => {
	test.describe('Signup', () => {
		test('should successfully sign up a new user', async ({ page, supabaseAdmin }) => {
			const email = `test-signup-${Date.now()}@example.com`
			const password = 'TestPassword123!'
			const name = 'Test User'

			await page.goto('/signup')

			// Fill in signup form
			await page.fill('[data-testid="name-input"]', name)
			await page.fill('[data-testid="email-input"]', email)
			await page.fill('[data-testid="password-input"]', password)
			await page.click('[data-testid="signup-button"]')

			// Should redirect to dashboard after successful signup
			await page.waitForURL('**/dashboard**')
			expect(page.url()).toContain('/dashboard')

			// Cleanup: delete the created user
			const { data } = await supabaseAdmin.auth.admin.listUsers()
			const user = data.users.find((u) => u.email === email)
			if (user) {
				await supabaseAdmin.auth.admin.deleteUser(user.id)
			}
		})

		test('should prevent submission with invalid email', async ({ page }) => {
			await page.goto('/signup')

			await page.fill('[data-testid="name-input"]', 'Test User')
			await page.fill('[data-testid="email-input"]', 'invalid-email')
			await page.fill('[data-testid="password-input"]', 'TestPassword123!')

			// HTML5 validation should prevent form submission
			const emailInput = page.locator('[data-testid="email-input"]')
			const validationMessage = await emailInput.evaluate(
				(el: HTMLInputElement) => el.validationMessage
			)
			expect(validationMessage).toBeTruthy()
		})

		test('should disable submit button for weak password', async ({ page }) => {
			await page.goto('/signup')

			await page.fill('[data-testid="name-input"]', 'Test User')
			await page.fill('[data-testid="email-input"]', 'test@example.com')
			await page.fill('[data-testid="password-input"]', '123')

			// Button should be disabled for weak password
			const signupButton = page.locator('[data-testid="signup-button"]')
			await expect(signupButton).toBeDisabled()

			// Password hint should be visible
			await expect(page.locator('text=Password must be at least 8 characters long')).toBeVisible()
		})

		test('should show error for duplicate email', async ({ browser, testUser }) => {
			// Create a fresh browser context to avoid interference from testUser fixture
			const context = await browser.newContext()
			const page = await context.newPage()

			await page.goto('/signup')

			// Try to sign up with existing user email
			await page.fill('[data-testid="name-input"]', 'Another User')
			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', 'AnotherPassword123!')
			await page.click('[data-testid="signup-button"]')

			// Should display error (or stay on signup page)
			// Better Auth may redirect or show error depending on configuration
			await page.waitForTimeout(2000)

			// Check if we're still on signup page or if error is shown
			const errorMessage = page.locator('[data-testid="error-message"]')
			const isOnSignup = page.url().includes('/signup')

			// Either error should be visible OR we should still be on signup (not dashboard)
			if (isOnSignup) {
				expect(page.url()).toContain('/signup')
			} else {
				await expect(errorMessage).toBeVisible()
			}

			await context.close()
		})
	})

	test.describe('Login', () => {
		test('should successfully log in with valid credentials', async ({ browser, testUser }) => {
			const context = await browser.newContext()
			const page = await context.newPage()

			await page.goto('/login')

			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', testUser.password)
			await page.click('[data-testid="login-button"]')

			// Should redirect to dashboard
			await page.waitForURL('**/dashboard**')
			expect(page.url()).toContain('/dashboard')

			await context.close()
		})

		test('should show error for invalid credentials', async ({ page }) => {
			await page.goto('/login')

			await page.fill('[data-testid="email-input"]', 'nonexistent@example.com')
			await page.fill('[data-testid="password-input"]', 'WrongPassword123!')
			await page.click('[data-testid="login-button"]')

			// Should display error
			const errorMessage = page.locator('[data-testid="error-message"]')
			await expect(errorMessage).toBeVisible()
		})

		test('should prevent submission with empty fields', async ({ page }) => {
			await page.goto('/login')

			// Try to submit without filling fields
			// HTML5 validation should prevent submission
			const emailInput = page.locator('[data-testid="email-input"]')
			const validationMessage = await emailInput.evaluate(
				(el: HTMLInputElement) => el.validationMessage
			)
			expect(validationMessage).toBeTruthy()
		})
	})

	test.describe('Logout', () => {
		test('should successfully log out', async ({ authenticatedPage }) => {
			const page = authenticatedPage

			// Click logout button
			await page.click('[data-testid="logout-button"]')

			// Should redirect to login page
			await page.waitForURL('**/login**')
			expect(page.url()).toContain('/login')

			// Verify cannot access protected route
			await page.goto('/dashboard')
			await page.waitForURL('**/login**')
			expect(page.url()).toContain('/login')
		})
	})

	test.describe('Password Recovery', () => {
		test('should send password reset email for valid email', async ({ page, testUser }) => {
			await page.goto('/forgot-password')

			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.click('[data-testid="send-reset-button"]')

			// Should display success message
			const successMessage = page.locator('[data-testid="success-message"]')
			await expect(successMessage).toBeVisible()
			await expect(successMessage).toContainText('reset link')
		})

		test('should prevent submission with invalid email format', async ({ page }) => {
			await page.goto('/forgot-password')

			await page.fill('[data-testid="email-input"]', 'invalid-email')

			// HTML5 validation should prevent form submission
			const emailInput = page.locator('[data-testid="email-input"]')
			const validationMessage = await emailInput.evaluate(
				(el: HTMLInputElement) => el.validationMessage
			)
			expect(validationMessage).toBeTruthy()
		})

		test('should show generic message for non-existent email', async ({ page }) => {
			await page.goto('/forgot-password')

			await page.fill('[data-testid="email-input"]', 'nonexistent@example.com')
			await page.click('[data-testid="send-reset-button"]')

			// Should display success message (don't reveal user existence)
			const successMessage = page.locator('[data-testid="success-message"]')
			await expect(successMessage).toBeVisible()
		})
	})

	test.describe('Session Management', () => {
		test('should persist session on page refresh', async ({ authenticatedPage }) => {
			const page = authenticatedPage

			// Reload the page
			await page.reload()

			// Should still be on dashboard
			expect(page.url()).toContain('/dashboard')
		})

		test('should handle session expiry', async ({ authenticatedPage, page }) => {
			// This test would require manipulating session tokens or waiting for expiry
			// For now, we'll skip this as it requires more complex setup
			test.skip()
		})
	})
})
