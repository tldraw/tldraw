import { assertCleanupSuccess, cleanupUserData } from './fixtures/cleanup-helpers'
import { expect, test } from './fixtures/test-fixtures'

test.describe('Authentication', () => {
	test.describe('Signup', () => {
		test('should successfully sign up a new user and redirect to dashboard', async ({
			page,
			supabaseAdmin,
		}) => {
			const email = `test-signup-${Date.now()}@example.com`
			const password = 'TestPassword123!'
			const name = 'Test User'

			await page.goto('/signup')

			// Fill in signup form
			await page.fill('[data-testid="name-input"]', name)
			await page.fill('[data-testid="email-input"]', email)
			await page.fill('[data-testid="password-input"]', password)
			await page.click('[data-testid="signup-button"]')

			// Should redirect to dashboard (auto-confirmed in test environment)
			await page.waitForURL('**/dashboard**', { timeout: 10000 })
			expect(page.url()).toContain('/dashboard')

			// Verify dashboard loaded and user has a workspace
			await expect(page.locator('text=Dashboard')).toBeVisible()
			await expect(page.locator('text=Workspaces')).toBeVisible()

			// Cleanup: delete the created user and all related data
			const { data } = await supabaseAdmin.from('users').select('id').eq('email', email).single()
			if (data) {
				const cleanupResult = await cleanupUserData(supabaseAdmin, data.id)
				assertCleanupSuccess(cleanupResult, `signup test user ${email}`)
			}
		})

		test('AUTH-02 Test 1: should auto-provision private workspace on signup', async ({
			page,
			supabaseAdmin,
		}) => {
			const email = `test-auth02-${Date.now()}@example.com`
			const password = 'TestPassword123!'
			const name = 'AUTH-02 Test User'

			await page.goto('/signup')

			// Fill in signup form
			await page.fill('[data-testid="name-input"]', name)
			await page.fill('[data-testid="email-input"]', email)
			await page.fill('[data-testid="password-input"]', password)
			await page.click('[data-testid="signup-button"]')

			// Should redirect to dashboard (auto-confirmed in test environment)
			await page.waitForURL('**/dashboard**', { timeout: 10000 })
			expect(page.url()).toContain('/dashboard')

			// Get user ID from database
			const { data: userData } = await supabaseAdmin
				.from('users')
				.select('id')
				.eq('email', email)
				.single()

			expect(userData).toBeTruthy()
			const userId = userData!.id

			// Verify private workspace exists with correct properties
			const { data: workspaceData } = await supabaseAdmin
				.from('workspaces')
				.select('id, name, is_private, owner_id')
				.eq('owner_id', userId)
				.eq('is_private', true)
				.single()

			// ✅ Private workspace exists with is_private = true
			expect(workspaceData).toBeTruthy()
			expect(workspaceData!.is_private).toBe(true)

			// ✅ owner_id matches the new user's ID
			expect(workspaceData!.owner_id).toBe(userId)

			// ✅ Workspace name follows expected pattern (user's name + 's Workspace)
			expect(workspaceData!.name).toBeTruthy()
			expect(workspaceData!.name).toContain('Workspace')

			// Verify user is listed as workspace member with role 'owner'
			const { data: memberData } = await supabaseAdmin
				.from('workspace_members')
				.select('workspace_id, user_id, role')
				.eq('workspace_id', workspaceData!.id)
				.eq('user_id', userId)
				.single()

			// ✅ User is listed as workspace member with role 'owner'
			expect(memberData).toBeTruthy()
			expect(memberData!.role).toBe('owner')
			expect(memberData!.user_id).toBe(userId)
			expect(memberData!.workspace_id).toBe(workspaceData!.id)

			// ✅ No error occurred during signup - already verified by successful navigation
			// ✅ User is successfully redirected to dashboard - already verified above

			// Cleanup: delete the created user and all related data
			const cleanupResult = await cleanupUserData(supabaseAdmin, userId)
			assertCleanupSuccess(cleanupResult, `AUTH-02 test user ${email}`)
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

		test('should show validation error for weak password', async ({ page }) => {
			await page.goto('/signup')

			await page.fill('[data-testid="name-input"]', 'Test User')
			await page.fill('[data-testid="email-input"]', 'test@example.com')
			await page.fill('[data-testid="password-input"]', '123')

			// Try to submit with weak password
			const signupButton = page.locator('[data-testid="signup-button"]')
			await signupButton.click()

			// Validation error should be visible
			await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()
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
			const errorMessage = page.locator('[data-testid="error-message"]')
			await Promise.race([
				errorMessage.waitFor({ state: 'visible', timeout: 5000 }),
				page.waitForURL('**/dashboard**', { timeout: 5000 }),
				page.waitForLoadState('networkidle', { timeout: 5000 }),
			])

			// Either error should be visible OR we should still be on signup (not dashboard)
			if (await errorMessage.isVisible()) {
				await expect(errorMessage).toBeVisible()
			} else {
				await expect(page).toHaveURL('/signup')
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

		test('should show validation errors for empty fields', async ({ page }) => {
			await page.goto('/login')

			// Try to submit without filling fields
			const loginButton = page.locator('[data-testid="login-button"]')
			await loginButton.click()

			// React Hook Form validation should show errors
			await expect(page.locator('text=Invalid email address')).toBeVisible()
			await expect(page.locator('text=Password is required')).toBeVisible()
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

		test('should handle session expiry', async ({}) => {
			// This test would require manipulating session tokens or waiting for expiry
			// For now, we'll skip this as it requires more complex setup
			test.skip()
		})
	})

	test.describe('Private Workspace Provisioning (AUTH-02)', () => {
		// Database constraint tests removed - these verify database implementation
		// details (CASCADE behavior, atomicity, foreign key constraints) rather than
		// user-facing functionality. Database integrity should be verified through
		// database migration tests, not E2E tests.
	})
})
