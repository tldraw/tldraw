import { expect, test } from './fixtures/test-fixtures'

test.describe('Workspace Member Limits', () => {
	test('shows warning when approaching member limit', async ({
		authenticatedPage,
		supabaseAdmin,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Limit Test ${Date.now()}`

		// Create workspace via test data helper
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: workspaceName,
		})
		const workspaceId = workspace.id

		// Add 89 more members to reach 90 total (warning threshold)
		// Note: workspace owner is already member #1
		for (let i = 0; i < 89; i++) {
			const memberEmail = `member_${Date.now()}_${i}@example.com`
			const { data: memberUser } = await supabaseAdmin.auth.admin.createUser({
				email: memberEmail,
				password: 'Password123!',
				email_confirm: true,
			})

			if (memberUser.user) {
				await testData.addWorkspaceMember(workspaceId, memberUser.user.id, 'member')
			}
		}

		// Navigate to members page
		await page.goto(`/workspace/${workspaceId}/members`)

		// Check for warning banner
		await expect(page.getByText('Approaching member limit:')).toBeVisible()
		await expect(page.getByText(/This workspace has 90 of 100 members/)).toBeVisible()

		// Check member count display
		await expect(page.getByText('Members (90/100)')).toBeVisible()
	})

	test('prevents joining workspace when at member limit', async ({
		authenticatedPage,
		supabaseAdmin,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Full Workspace ${Date.now()}`

		// Create workspace via test data helper
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: workspaceName,
		})
		const workspaceId = workspace.id

		// Get invite token
		const { data: inviteLink } = await supabaseAdmin
			.from('invitation_links')
			.select('token')
			.eq('workspace_id', workspaceId)
			.single()

		// Add 99 more members to reach the 100 limit
		for (let i = 0; i < 99; i++) {
			const memberEmail = `member_${Date.now()}_${i}@example.com`
			const { data: memberUser } = await supabaseAdmin.auth.admin.createUser({
				email: memberEmail,
				password: 'Password123!',
				email_confirm: true,
			})

			if (memberUser.user) {
				await testData.addWorkspaceMember(workspaceId, memberUser.user.id, 'member')
			}
		}

		// Try to join with invitation link - should fail
		if (inviteLink?.token) {
			const joinResponse = await page.request.post(`/api/invite/${inviteLink.token}/join`)
			expect(joinResponse.status()).toBe(422)
			const result = await joinResponse.json()
			expect(result.error.code).toBe('WORKSPACE_MEMBER_LIMIT_EXCEEDED')
			expect(result.error.message).toContain(
				'Workspace has reached the maximum limit of 100 members'
			)
		}

		// Verify audit log was created
		const { data: auditLog } = await supabaseAdmin
			.from('audit_logs')
			.select('*')
			.eq('workspace_id', workspaceId)
			.eq('action', 'member_limit_exceeded')
			.maybeSingle()

		if (inviteLink?.token) {
			expect(auditLog).toBeTruthy()
			expect(auditLog?.metadata?.attempted_action).toBe('join_workspace_by_invitation')
			expect(auditLog?.metadata?.current_count).toBe(100)
		}
	})

	test('shows warning in API response when near limit', async ({
		authenticatedPage,
		supabaseAdmin,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Near Limit ${Date.now()}`

		// Create workspace via test data helper
		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: workspaceName,
		})
		const workspaceId = workspace.id

		// Get invite token
		const { data: inviteLink } = await supabaseAdmin
			.from('invitation_links')
			.select('token')
			.eq('workspace_id', workspaceId)
			.single()

		// Add 89 members (total 90 with owner)
		for (let i = 0; i < 89; i++) {
			const memberEmail = `member_${Date.now()}_${i}@example.com`
			const { data: memberUser } = await supabaseAdmin.auth.admin.createUser({
				email: memberEmail,
				password: 'Password123!',
				email_confirm: true,
			})

			if (memberUser.user) {
				await testData.addWorkspaceMember(workspaceId, memberUser.user.id, 'member')
			}
		}

		// Create one more user to join (will be member #91)
		const newMemberEmail = `new_member_${Date.now()}@example.com`
		const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
			email: newMemberEmail,
			password: 'Password123!',
			email_confirm: true,
			user_metadata: {
				name: 'New Member',
				display_name: 'New Member',
			},
		})

		// Wait for user to be synced to public.users table (trigger takes a moment)
		if (newUser.user) {
			const userId = newUser.user.id
			const maxWait = 5000
			const startTime = Date.now()
			while (Date.now() - startTime < maxWait) {
				const { data } = await supabaseAdmin
					.from('users')
					.select('id')
					.eq('id', userId)
					.maybeSingle()
				if (data) break
				await new Promise((resolve) => setTimeout(resolve, 100))
			}
		}

		// Create new browser context for the new user
		const browser = page.context().browser()!
		const newUserContext = await browser.newContext()
		const newUserPage = await newUserContext.newPage()

		// Sign in as the new user
		await newUserPage.goto('/login')
		await newUserPage.fill('[data-testid="email-input"]', newMemberEmail)
		await newUserPage.fill('[data-testid="password-input"]', 'Password123!')
		await newUserPage.click('[data-testid="login-button"]')
		await newUserPage.waitForURL('**/dashboard**')

		// Join via invitation - should succeed with warning
		if (inviteLink?.token && newUser.user) {
			const joinResponse = await newUserPage.request.post(`/api/invite/${inviteLink.token}/join`)
			const result = await joinResponse.json()
			expect(joinResponse.ok()).toBeTruthy()
			expect(result.data.warning).toContain('This workspace is approaching its member limit')
			expect(result.data.member_count).toBe(91)
		}

		// Clean up
		await newUserContext.close()
	})
})
