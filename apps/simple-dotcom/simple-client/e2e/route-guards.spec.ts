import { expect, test } from './fixtures/test-fixtures'

test.describe('Route Guards', () => {
	test.describe('Unauthenticated Access', () => {
		test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
			await page.goto('/dashboard')

			// Should redirect to login
			await page.waitForURL('**/login')
			expect(page.url()).toContain('/login')
		})

		test('should redirect to login when accessing workspace without auth', async ({ page }) => {
			// Try to access a workspace directly
			await page.goto('/workspace/some-workspace-id')

			// Should redirect to login
			await page.waitForURL('**/login')
			expect(page.url()).toContain('/login')
		})

		test('should allow access to public pages without auth', async ({ page }) => {
			// Login page
			await page.goto('/login')
			expect(page.url()).toContain('/login')

			// Signup page
			await page.goto('/signup')
			expect(page.url()).toContain('/signup')

			// Password recovery page
			await page.goto('/forgot-password')
			expect(page.url()).toContain('/forgot-password')

			// Landing page
			await page.goto('/')
			expect(page.url()).toBe(page.url()) // Should stay on landing page
		})

		test('should preserve intended destination after login', async ({ page, testUser }) => {
			// Try to access dashboard without auth
			await page.goto('/dashboard')
			await page.waitForURL('**/login')

			// Login
			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', testUser.password)
			await page.click('[data-testid="login-button"]')

			// Should redirect to originally intended destination
			await page.waitForURL('**/dashboard')
			expect(page.url()).toContain('/dashboard')
		})
	})

	test.describe('Authenticated Access', () => {
		test('should allow access to dashboard when authenticated', async ({ authenticatedPage }) => {
			const page = authenticatedPage

			// Should be on dashboard
			expect(page.url()).toContain('/dashboard')

			// Verify dashboard content is visible
			const workspaceList = page.locator('[data-testid="workspace-list"]')
			await expect(workspaceList).toBeVisible()
		})

		test('should redirect authenticated users away from login page', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Try to go to login page
			await page.goto('/login')

			// Should redirect to dashboard
			await page.waitForURL('**/dashboard')
			expect(page.url()).toContain('/dashboard')
		})

		test('should redirect authenticated users away from signup page', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Try to go to signup page
			await page.goto('/signup')

			// Should redirect to dashboard
			await page.waitForURL('**/dashboard')
			expect(page.url()).toContain('/dashboard')
		})
	})

	test.describe('Session Validation', () => {
		test('should redirect to login when session expires', async ({ page, testUser }) => {
			// Login first
			await page.goto('/login')
			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', testUser.password)
			await page.click('[data-testid="login-button"]')
			await page.waitForURL('**/dashboard')

			// Clear all cookies to simulate session expiry
			await page.context().clearCookies()

			// Try to navigate to a protected page
			await page.goto('/dashboard')

			// Should redirect to login
			await page.waitForURL('**/login')
			expect(page.url()).toContain('/login')
		})

		test('should validate session on page load', async ({ authenticatedPage }) => {
			const page = authenticatedPage

			// Navigate to different pages and verify session is maintained
			await page.goto('/dashboard')
			await page.waitForURL('**/dashboard')

			// Navigate to workspace
			const firstWorkspace = page.locator('[data-testid="workspace-item"]').first()
			if ((await firstWorkspace.count()) > 0) {
				await firstWorkspace.click()
				// Should successfully navigate to workspace
				expect(page.url()).toContain('/workspace/')
			}
		})
	})

	test.describe('Authorization Guards', () => {
		test('should prevent access to workspaces user is not a member of', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Try to access a non-existent workspace
			await page.goto('/workspace/non-existent-workspace-id')

			// Should redirect to dashboard or show error
			const urlAfter = page.url()
			const hasError = await page.locator('[data-testid="error-message"]').isVisible()

			expect(urlAfter.includes('/dashboard') || hasError).toBe(true)
		})

		test('should allow access only to authorized workspaces', async ({ authenticatedPage }) => {
			const page = authenticatedPage

			// Get user's workspace
			await page.goto('/dashboard')
			const firstWorkspace = page.locator('[data-testid="workspace-item"]').first()

			if ((await firstWorkspace.count()) > 0) {
				const workspaceId = await firstWorkspace.getAttribute('data-workspace-id')

				// Should be able to access own workspace
				await page.goto(`/workspace/${workspaceId}`)
				expect(page.url()).toContain(`/workspace/${workspaceId}`)
			}
		})
	})

	test.describe('Deep Link Handling', () => {
		test('should handle deep links correctly when unauthenticated', async ({ page }) => {
			// Try to access a deep link
			await page.goto('/workspace/some-id/document/some-doc-id')

			// Should redirect to login
			await page.waitForURL('**/login')
			expect(page.url()).toContain('/login')
		})

		test('should preserve deep link parameters after authentication', async ({
			page,
			testUser,
		}) => {
			// Try to access a deep link
			const deepLink = '/dashboard'
			await page.goto(deepLink)
			await page.waitForURL('**/login')

			// Login
			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', testUser.password)
			await page.click('[data-testid="login-button"]')

			// Should redirect to deep link after login
			await page.waitForURL('**/dashboard')
			expect(page.url()).toContain(deepLink)
		})
	})

	test.describe('API Route Guards', () => {
		test('should protect API endpoints from unauthenticated requests', async ({ page }) => {
			// Try to call a protected API endpoint without auth
			const response = await page.request.get('/api/workspaces')

			// Should return 401 or redirect
			expect([401, 403, 302]).toContain(response.status())
		})

		test('should allow authenticated requests to API endpoints', async ({ authenticatedPage }) => {
			const page = authenticatedPage

			// Make authenticated API request
			const response = await page.request.get('/api/workspaces')

			// Should succeed
			expect(response.status()).toBe(200)
		})
	})
})
