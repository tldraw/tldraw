import { expect, test } from './fixtures/test-fixtures'

test.describe('Authentication', () => {
	test.describe('Signup', () => {
		test('should successfully sign up a new user', async ({ page, supabaseAdmin }) => {
			const email = `test-signup-${Date.now()}@example.com`
			const password = 'TestPassword123!'

			await page.goto('/signup')

			// Fill in signup form
			await page.fill('[data-testid="email-input"]', email)
			await page.fill('[data-testid="password-input"]', password)
			await page.click('[data-testid="signup-button"]')

			// Should redirect to dashboard after successful signup
			await page.waitForURL('**/dashboard')
			expect(page.url()).toContain('/dashboard')

			// Cleanup: delete the created user
			const { data } = await supabaseAdmin.auth.admin.listUsers()
			const user = data.users.find((u) => u.email === email)
			if (user) {
				await supabaseAdmin.auth.admin.deleteUser(user.id)
			}
		})

		test('should show error for invalid email', async ({ page }) => {
			await page.goto('/signup')

			await page.fill('[data-testid="email-input"]', 'invalid-email')
			await page.fill('[data-testid="password-input"]', 'TestPassword123!')
			await page.click('[data-testid="signup-button"]')

			// Should display validation error
			const errorMessage = page.locator('[data-testid="error-message"]')
			await expect(errorMessage).toBeVisible()
		})

		test('should show error for weak password', async ({ page }) => {
			await page.goto('/signup')

			await page.fill('[data-testid="email-input"]', 'test@example.com')
			await page.fill('[data-testid="password-input"]', '123')
			await page.click('[data-testid="signup-button"]')

			// Should display validation error
			const errorMessage = page.locator('[data-testid="error-message"]')
			await expect(errorMessage).toBeVisible()
		})

		test('should show error for duplicate email', async ({ page, testUser }) => {
			await page.goto('/signup')

			// Try to sign up with existing user email
			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', 'AnotherPassword123!')
			await page.click('[data-testid="signup-button"]')

			// Should display error
			const errorMessage = page.locator('[data-testid="error-message"]')
			await expect(errorMessage).toBeVisible()
		})
	})

	test.describe('Login', () => {
		test('should successfully log in with valid credentials', async ({ page, testUser }) => {
			await page.goto('/login')

			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', testUser.password)
			await page.click('[data-testid="login-button"]')

			// Should redirect to dashboard
			await page.waitForURL('**/dashboard')
			expect(page.url()).toContain('/dashboard')
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

		test('should show error for empty fields', async ({ page }) => {
			await page.goto('/login')

			await page.click('[data-testid="login-button"]')

			// Should display validation errors
			const errorMessage = page.locator('[data-testid="error-message"]')
			await expect(errorMessage).toBeVisible()
		})
	})

	test.describe('Logout', () => {
		test('should successfully log out', async ({ authenticatedPage }) => {
			const page = authenticatedPage

			// Click logout button
			await page.click('[data-testid="logout-button"]')

			// Should redirect to login page
			await page.waitForURL('**/login')
			expect(page.url()).toContain('/login')

			// Verify cannot access protected route
			await page.goto('/dashboard')
			await page.waitForURL('**/login')
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

		test('should show error for invalid email format', async ({ page }) => {
			await page.goto('/forgot-password')

			await page.fill('[data-testid="email-input"]', 'invalid-email')
			await page.click('[data-testid="send-reset-button"]')

			// Should display error
			const errorMessage = page.locator('[data-testid="error-message"]')
			await expect(errorMessage).toBeVisible()
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
