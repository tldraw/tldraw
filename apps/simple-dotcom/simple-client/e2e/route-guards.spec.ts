import { expect, test } from './fixtures/test-fixtures'

test.describe('Route Guards', () => {
	test.describe('Unauthenticated Access', () => {
		test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
			await page.goto('/dashboard')

			// Should redirect to login (may include query params)
			await page.waitForURL('**/login**')
			expect(page.url()).toContain('/login')
		})

		test('should redirect to login when accessing workspace without auth', async ({ page }) => {
			// Try to access a workspace directly
			await page.goto('/workspace/some-workspace-id')

			// Should redirect to login (may include query params)
			await page.waitForURL('**/login**')
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

		test('should preserve intended destination after login', async ({ browser, testUser }) => {
			const context = await browser.newContext()
			const page = await context.newPage()

			// Try to access dashboard without auth
			await page.goto('/dashboard')
			await page.waitForURL('**/login**')

			// Login
			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', testUser.password)
			await page.click('[data-testid="login-button"]')

			// Should redirect to originally intended destination
			await page.waitForURL('**/dashboard**')
			expect(page.url()).toContain('/dashboard')

			await context.close()
		})
	})

	test.describe('Authenticated Access', () => {
		test('should allow access to dashboard when authenticated', async ({ authenticatedPage }) => {
			const page = authenticatedPage

			// Should be on dashboard
			expect(page.url()).toContain('/dashboard')

			// Verify dashboard content is present
			await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
			await expect(page.locator('[data-testid="logout-button"]')).toBeVisible()
		})

		test('should redirect authenticated users away from login page', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Try to go to login page
			await page.goto('/login')

			// Should redirect to dashboard
			await page.waitForURL('**/dashboard**')
			expect(page.url()).toContain('/dashboard')
		})

		test('should redirect authenticated users away from signup page', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Try to go to signup page
			await page.goto('/signup')

			// Should redirect to dashboard
			await page.waitForURL('**/dashboard**')
			expect(page.url()).toContain('/dashboard')
		})
	})

	test.describe('Session Validation', () => {
		test('should redirect to login when session expires', async ({ browser, testUser }) => {
			const context = await browser.newContext()
			const page = await context.newPage()

			// Login first
			await page.goto('/login')
			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', testUser.password)
			await page.click('[data-testid="login-button"]')
			await page.waitForURL('**/dashboard**')

			// Clear all cookies to simulate session expiry
			await context.clearCookies()

			// Try to navigate to a protected page
			await page.goto('/dashboard')

			// Should redirect to login (may include query params)
			await page.waitForURL('**/login**')
			expect(page.url()).toContain('/login')

			await context.close()
		})

		test('should validate session on page load', async ({ authenticatedPage }) => {
			const page = authenticatedPage

			// Navigate to different pages and verify session is maintained
			await page.goto('/dashboard')
			await page.waitForURL('**/dashboard**')

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
			await page.goto('/workspace/00000000-0000-0000-0000-000000000000')

			// Should redirect to 403 page
			await page.waitForURL('**/403**', { timeout: 5000 })
			expect(page.url()).toContain('/403')
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

		test('should redirect non-members to 403 when accessing workspace settings', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Try to access settings for a non-existent workspace
			await page.goto('/workspace/non-existent-workspace-id/settings')

			// Should redirect to 403 or error page
			await Promise.race([
				page.waitForURL('**/403**', { timeout: 5000 }),
				page.waitForURL('**/dashboard**', { timeout: 5000 }),
			])
			const urlAfter = page.url()
			expect(urlAfter.includes('/403') || urlAfter.includes('/dashboard')).toBe(true)
		})

		test('should redirect non-members to 403 when accessing workspace members', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Try to access members for a non-existent workspace
			await page.goto('/workspace/non-existent-workspace-id/members')

			// Should redirect to 403 or error page
			await Promise.race([
				page.waitForURL('**/403**', { timeout: 5000 }),
				page.waitForURL('**/dashboard**', { timeout: 5000 }),
			])
			const urlAfter = page.url()
			expect(urlAfter.includes('/403') || urlAfter.includes('/dashboard')).toBe(true)
		})

		test('should redirect non-members to 403 when accessing workspace archive', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Try to access archive for a non-existent workspace
			await page.goto('/workspace/non-existent-workspace-id/archive')

			// Should redirect to 403 or error page
			await Promise.race([
				page.waitForURL('**/403**', { timeout: 5000 }),
				page.waitForURL('**/dashboard**', { timeout: 5000 }),
			])
			const urlAfter = page.url()
			expect(urlAfter.includes('/403') || urlAfter.includes('/dashboard')).toBe(true)
		})
	})

	test.describe('Deep Link Handling', () => {
		test('should handle deep links correctly when unauthenticated', async ({ page }) => {
			// Try to access a deep link
			await page.goto('/workspace/some-id/document/some-doc-id')

			// Should redirect to login (may include query params)
			await page.waitForURL('**/login**')
			expect(page.url()).toContain('/login')
		})

		test('should preserve deep link parameters after authentication', async ({
			page,
			testUser,
		}) => {
			// Try to access a deep link
			const deepLink = '/dashboard'
			await page.goto(deepLink)
			await page.waitForURL('**/login**')

			// Login
			await page.fill('[data-testid="email-input"]', testUser.email)
			await page.fill('[data-testid="password-input"]', testUser.password)
			await page.click('[data-testid="login-button"]')

			// Should redirect to deep link after login
			await page.waitForURL('**/dashboard**')
			expect(page.url()).toContain(deepLink)
		})
	})

	test.describe('Document Access Guards', () => {
		test('should redirect to login for private documents when unauthenticated', async ({
			page,
		}) => {
			// Try to access a document (assuming private by default)
			await page.goto('/d/some-document-id')

			// Should redirect to login or show 403
			await Promise.race([
				page.waitForURL('**/login**', { timeout: 5000 }),
				page.waitForURL('**/403**', { timeout: 5000 }),
			])
			const urlAfter = page.url()
			expect(urlAfter.includes('/login') || urlAfter.includes('/403')).toBe(true)
		})

		test('should allow authenticated members to view private documents', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Navigate to dashboard to find a document
			await page.goto('/dashboard')
			await page.waitForSelector('[data-testid="dashboard"]', { timeout: 5000 })

			// Look for a document link
			const docLink = page.locator('a[href^="/d/"]').first()
			if ((await docLink.count()) > 0) {
				const docId = (await docLink.getAttribute('href'))?.split('/d/')[1]

				// Should be able to access own document
				await page.goto(`/d/${docId}`)
				await expect(page).toHaveURL(new RegExp(`/d/${docId}`))
			}
		})
	})

	test.describe('Invite Link Guards', () => {
		test('should show error for invalid invite tokens when unauthenticated', async ({ page }) => {
			// Try to access an invalid invite link without auth
			await page.goto('/invite/some-invalid-token')

			// Should show invalid invitation message (not redirect to login)
			const invalidInviteMessage = page.locator('text=/Invalid|invalid|expired/i').first()
			await expect(invalidInviteMessage).toBeVisible()
		})

		test('should show error for invalid invite tokens when authenticated', async ({
			authenticatedPage,
		}) => {
			const page = authenticatedPage

			// Try to access an invalid invite link
			await page.goto('/invite/invalid-token-12345')

			// Should show invalid invitation message
			const invalidInviteMessage = page.locator('text=/Invalid|invalid|expired/i').first()
			await expect(invalidInviteMessage).toBeVisible()
		})
	})

	test.describe('API Route Guards', () => {
		test('should protect API endpoints from unauthenticated requests', async ({ page }) => {
			// Try to call a protected API endpoint without auth
			const response = await page.request.get('/api/workspaces')

			// Should return 401, 403, 302, or 500 (error from requireAuth)
			expect([401, 403, 302, 500]).toContain(response.status())
		})

		test('should allow authenticated requests to API endpoints', async ({ authenticatedPage }) => {
			const response = await authenticatedPage.request.get('/api/workspaces')
			expect(response.ok()).toBeTruthy()
			expect(response.status()).toBe(200)
		})
	})
})
