import { expect, test } from './fixtures/test-fixtures'

test.describe('Workspace Member Limits', () => {
	test('shows warning when approaching member limit', async ({
		authenticatedPage,
		supabaseAdmin,
	}) => {
		const page = authenticatedPage
		const workspaceName = `Limit Test ${Date.now()}`

		// Create workspace
		await page.goto('/dashboard')
		await page.getByRole('button', { name: 'Create Workspace' }).click()
		await page.getByPlaceholder('Enter workspace name').fill(workspaceName)
		await page.getByRole('button', { name: 'Create' }).click()
		await expect(page.getByText(workspaceName)).toBeVisible()

		// Get workspace ID
		await page.getByText(workspaceName).click()
		const workspaceUrl = page.url()
		const workspaceId = workspaceUrl.split('/workspace/')[1]

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
				await supabaseAdmin.from('workspace_members').insert({
					workspace_id: workspaceId,
					user_id: memberUser.user.id,
					workspace_role: 'member',
				})
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
	}) => {
		const page = authenticatedPage
		const workspaceName = `Full Workspace ${Date.now()}`

		// Create workspace
		await page.goto('/dashboard')
		await page.getByRole('button', { name: 'Create Workspace' }).click()
		await page.getByPlaceholder('Enter workspace name').fill(workspaceName)
		await page.getByRole('button', { name: 'Create' }).click()
		await expect(page.getByText(workspaceName)).toBeVisible()

		// Get workspace ID
		await page.getByText(workspaceName).click()
		const workspaceUrl = page.url()
		const workspaceId = workspaceUrl.split('/workspace/')[1]

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
				await supabaseAdmin.from('workspace_members').insert({
					workspace_id: workspaceId,
					user_id: memberUser.user.id,
					workspace_role: 'member',
				})
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
	}) => {
		const page = authenticatedPage
		const workspaceName = `Near Limit ${Date.now()}`

		// Create workspace
		await page.goto('/dashboard')
		await page.getByRole('button', { name: 'Create Workspace' }).click()
		await page.getByPlaceholder('Enter workspace name').fill(workspaceName)
		await page.getByRole('button', { name: 'Create' }).click()
		await expect(page.getByText(workspaceName)).toBeVisible()

		// Get workspace ID
		await page.getByText(workspaceName).click()
		const workspaceUrl = page.url()
		const workspaceId = workspaceUrl.split('/workspace/')[1]

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
				await supabaseAdmin.from('workspace_members').insert({
					workspace_id: workspaceId,
					user_id: memberUser.user.id,
					workspace_role: 'member',
				})
			}
		}

		// Create one more user to join (will be member #91)
		const newMemberEmail = `new_member_${Date.now()}@example.com`
		const { data: newUser } = await supabaseAdmin.auth.admin.createUser({
			email: newMemberEmail,
			password: 'Password123!',
			email_confirm: true,
		})

		// Sign in as the new user
		await page.goto('/sign-in')
		await page.getByPlaceholder('email@example.com').fill(newMemberEmail)
		await page.getByPlaceholder('Enter your password').fill('Password123!')
		await page.getByRole('button', { name: 'Sign In' }).click()

		// Join via invitation - should succeed with warning
		if (inviteLink?.token && newUser.user) {
			const joinResponse = await page.request.post(`/api/invite/${inviteLink.token}/join`)
			expect(joinResponse.ok()).toBeTruthy()
			const result = await joinResponse.json()
			expect(result.data.warning).toContain('This workspace is approaching its member limit')
			expect(result.data.member_count).toBe(91)
		}
	})
})
