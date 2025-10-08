import { Page } from '@playwright/test'
import {
	createAuthenticatedUser,
	expect,
	SELECTORS,
	test,
	TEST_PASSWORD,
} from './fixtures/test-fixtures'

// Helper to generate unique workspace names
function generateWorkspaceName(): string {
	const timestamp = Date.now()
	const random = Math.random().toString(36).substring(2, 6)
	return `Test Workspace ${timestamp}-${random}`
}

// Helper to create a test workspace and get its invite token
async function createWorkspaceWithInvite(page: Page): Promise<{
	workspaceId: string
	workspaceName: string
	inviteToken: string
}> {
	// Create a workspace via API
	const workspaceName = generateWorkspaceName()
	const response = await page.request.post('/api/workspaces', {
		data: { name: workspaceName },
	})

	expect(response.ok()).toBeTruthy()
	const workspaceData = await response.json()
	const workspaceId = workspaceData.data.id

	// Wait for database trigger to create invitation link using Playwright's polling
	await expect
		.poll(
			async () => {
				const res = await page.request.get(`/api/workspaces/${workspaceId}/invite`)
				if (!res.ok()) return null
				const data = await res.json()
				return data.data?.enabled === true ? data.data : null
			},
			{ timeout: 5000, message: 'Invitation link not created within timeout' }
		)
		.toBeTruthy()

	// Fetch the final invitation data
	const inviteResponse = await page.request.get(`/api/workspaces/${workspaceId}/invite`)
	const inviteData = await inviteResponse.json()

	return {
		workspaceId,
		workspaceName,
		inviteToken: inviteData.data.token,
	}
}

test.describe('Workspace Invitation Flow', () => {
	test.describe('Unauthenticated User Flow', () => {
		test('should redirect to login with preserved redirect URL', async ({ browser }) => {
			// Create owner user
			const { context: ownerContext, page: ownerPage } = await createAuthenticatedUser(
				browser,
				'Owner User'
			)

			// Create workspace and get invite
			const { inviteToken } = await createWorkspaceWithInvite(ownerPage)
			await ownerContext.close()

			// Create new context for unauthenticated user
			const userContext = await browser.newContext()
			const userPage = await userContext.newPage()

			// Visit invite link while unauthenticated
			await userPage.goto(`/invite/${inviteToken}`)

			// Should redirect to login with redirect parameter
			await expect(userPage).toHaveURL(/\/login\?redirect=%2Finvite%2F/)

			// Check for invite context message
			await expect(userPage.locator('text=Sign in to join the workspace')).toBeVisible()

			// Verify signup link preserves redirect
			const signupLink = userPage.locator('a:has-text("Sign up")')
			const href = await signupLink.getAttribute('href')
			expect(href).toContain(`redirect=%2Finvite%2F${inviteToken}`)

			await userContext.close()
		})

		test('should join workspace after signup', async ({ browser }) => {
			// Create owner user
			const { context: ownerContext, page: ownerPage } = await createAuthenticatedUser(
				browser,
				'Owner User'
			)

			// Create workspace and get invite
			const { workspaceId, workspaceName, inviteToken } = await createWorkspaceWithInvite(ownerPage)
			await ownerContext.close()

			// Create new context for joining user
			const userContext = await browser.newContext()
			const userPage = await userContext.newPage()

			// Visit invite link
			await userPage.goto(`/invite/${inviteToken}`)

			// Should redirect to login
			await expect(userPage).toHaveURL(/\/login\?redirect=%2Finvite%2F/)

			// Sign up instead
			await userPage.click('text=Sign up')
			await expect(userPage).toHaveURL(/\/signup\?redirect=%2Finvite%2F/)

			// Check for invite context
			await expect(userPage.locator('text=Create an account to join the workspace')).toBeVisible()

			// Fill signup form (note: we keep inline signup here as it's part of the redirect flow being tested)
			const timestamp = Date.now()
			const random = Math.random().toString(36).substring(2, 8)
			const joinerEmail = `test-invite-${timestamp}-${random}@example.com`
			await userPage.fill(SELECTORS.nameInput, 'Joining User')
			await userPage.fill(SELECTORS.emailInput, joinerEmail)
			await userPage.fill(SELECTORS.passwordInput, TEST_PASSWORD)

			// Submit signup
			await userPage.click(SELECTORS.signupButton)

			// Should redirect back to invite page after signup
			await userPage.waitForURL(`/invite/${inviteToken}`)

			// Should see join button
			await expect(userPage.getByRole('button', { name: 'Join Workspace' })).toBeVisible()
			await expect(userPage.locator(`text="${workspaceName}"`)).toBeVisible()

			// Join workspace
			await userPage.click('button:has-text("Join Workspace")')

			// Should redirect to workspace
			await userPage.waitForURL(`/workspace/${workspaceId}`)

			// Verify joined successfully
			await expect(userPage.locator('h1')).toContainText(workspaceName)

			await userContext.close()
		})
	})

	test.describe('Authenticated User Flow', () => {
		test('should join workspace immediately when authenticated', async ({ authenticatedPage }) => {
			// Create workspace with current user
			const { workspaceId, inviteToken } = await createWorkspaceWithInvite(authenticatedPage)

			// Create new authenticated user
			const browser = authenticatedPage.context().browser()!
			const { context: newUserContext, page: newUserPage } = await createAuthenticatedUser(
				browser,
				'New User'
			)

			// Visit invite link as authenticated new user
			await newUserPage.goto(`/invite/${inviteToken}`)

			// Debug: Check what's on the page
			const bodyText = await newUserPage.locator('body').textContent()
			console.log('[DEBUG] Body text for join test:', bodyText?.substring(0, 300))

			// Should see join button immediately (no redirect to login)
			await expect(newUserPage.getByRole('button', { name: 'Join Workspace' })).toBeVisible()

			// Join workspace
			await newUserPage.click('button:has-text("Join Workspace")')

			// Should redirect to workspace
			await newUserPage.waitForURL(`/workspace/${workspaceId}`)

			await newUserContext.close()
		})

		test('should show already member message', async ({ authenticatedPage }) => {
			// Create workspace with current user
			const { workspaceId, inviteToken } = await createWorkspaceWithInvite(authenticatedPage)

			// Visit own workspace invite link
			await authenticatedPage.goto(`/invite/${inviteToken}`)

			// Should see already member message
			await expect(authenticatedPage.locator('text=Already a Member')).toBeVisible()
			await expect(
				authenticatedPage.locator('text=You are the owner of this workspace')
			).toBeVisible()

			// Should have link to workspace
			await authenticatedPage.click('text=Go to Workspace')
			await authenticatedPage.waitForURL(`/workspace/${workspaceId}`)
		})
	})

	test.describe('Error Scenarios', () => {
		test('should show error for invalid token', async ({ page }) => {
			await page.goto('/invite/invalid-token-12345')

			// Should show invalid message
			await expect(page.locator('text=Invalid Invitation')).toBeVisible()
			await expect(page.locator('text=This invitation link is invalid')).toBeVisible()
		})

		test('should show error for disabled link', async ({ authenticatedPage }) => {
			// Create workspace with invite (as owner)
			const { workspaceId, inviteToken } = await createWorkspaceWithInvite(authenticatedPage)

			// Disable the invite link
			const disableResponse = await authenticatedPage.request.patch(
				`/api/workspaces/${workspaceId}/invite`,
				{ data: { enabled: false } }
			)
			expect(disableResponse.ok()).toBeTruthy()

			// Create new authenticated user to test as a different user (not the owner)
			const browser = authenticatedPage.context().browser()!
			const { context: newUserContext, page: newUserPage } = await createAuthenticatedUser(
				browser,
				'New User'
			)

			// Visit disabled invite link as authenticated user (not a member)
			await newUserPage.goto(`/invite/${inviteToken}`)

			// Should see disabled message
			await expect(newUserPage.locator('text=Link Disabled')).toBeVisible()

			await newUserContext.close()
		})

		test('should show error for regenerated token', async ({ authenticatedPage }) => {
			// Create workspace with invite
			const { workspaceId, inviteToken: oldToken } =
				await createWorkspaceWithInvite(authenticatedPage)

			// Regenerate the invite link
			const regenerateResponse = await authenticatedPage.request.post(
				`/api/workspaces/${workspaceId}/invite/regenerate`
			)
			if (!regenerateResponse.ok()) {
				const body = await regenerateResponse.json()
				console.error('[DEBUG] Regenerate API failed:', regenerateResponse.status(), body)
			}
			expect(regenerateResponse.ok()).toBeTruthy()

			// Create new authenticated user
			const browser = authenticatedPage.context().browser()!
			const { context: newUserContext, page: newUserPage } = await createAuthenticatedUser(
				browser,
				'New User'
			)

			// Visit old token as authenticated user
			await newUserPage.goto(`/invite/${oldToken}`)

			// Should see regenerated message
			await expect(newUserPage.locator('text=Link Expired')).toBeVisible()
			await expect(newUserPage.locator('text=A new link was generated')).toBeVisible()

			await newUserContext.close()
		})
	})

	test.describe('Redirect Preservation', () => {
		test('should preserve redirect when switching between login and signup', async ({
			browser,
		}) => {
			// Create owner and workspace
			const { context: ownerContext, page: ownerPage } = await createAuthenticatedUser(
				browser,
				'Owner'
			)

			const { inviteToken } = await createWorkspaceWithInvite(ownerPage)
			await ownerContext.close()

			// Test redirect preservation
			const userContext = await browser.newContext()
			const userPage = await userContext.newPage()

			// Visit invite link
			await userPage.goto(`/invite/${inviteToken}`)

			// Redirected to login
			await expect(userPage).toHaveURL(/\/login\?redirect=%2Finvite%2F/)

			// Switch to signup
			await userPage.click('text=Sign up')
			await expect(userPage).toHaveURL(/\/signup\?redirect=%2Finvite%2F/)

			// Switch back to login
			await userPage.click('text=Log in')
			await expect(userPage).toHaveURL(/\/login\?redirect=%2Finvite%2F/)

			// Redirect parameter should be preserved throughout
			await userContext.close()
		})
	})
})
