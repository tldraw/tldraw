import { cleanupUserData } from './fixtures/cleanup-helpers'
import { expect, test } from './fixtures/test-fixtures'

test.describe('Member Management', () => {
	test('owner can view and remove workspace members', async ({
		authenticatedPage,
		supabaseAdmin,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage

		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Members Test Workspace ${Date.now()}`,
		})

		await supabaseAdmin.from('users').update({ display_name: 'Owner User' }).eq('id', testUser.id)

		const memberEmail = `member-${Date.now()}@example.com`
		const { data: memberAuth, error: memberError } = await supabaseAdmin.auth.admin.createUser({
			email: memberEmail,
			password: 'TestPassword123!',
			email_confirm: true,
			user_metadata: {
				display_name: 'Member User',
				name: 'Member User',
			},
		})

		if (memberError || !memberAuth?.user?.id) {
			throw new Error(`Failed to create member user: ${memberError?.message ?? 'Unknown error'}`)
		}

		const memberId = memberAuth.user.id
		await testData.addWorkspaceMember(workspace.id, memberId)

		await page.goto(`/workspace/${workspace.id}/members`)
		await expect(page.getByRole('heading', { name: 'Workspace Members' })).toBeVisible()

		await expect(page.getByText('Owner User')).toBeVisible()
		await expect(page.getByText('Member User')).toBeVisible()

		page.once('dialog', (dialog) => dialog.accept())
		const memberRow = page
			.locator('div')
			.filter({ hasText: 'Member User' })
			.filter({ has: page.locator('button:has-text("Remove")') })
			.first()
		await memberRow.locator('button:has-text("Remove")').click()

		await expect(page.getByText('Member removed')).toBeVisible()
		await expect(page.getByText('Member User')).toHaveCount(0)

		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		await cleanupUserData(supabaseAdmin, memberId)
		await supabaseAdmin.auth.admin.deleteUser(memberId)
	})

	test('search and pagination work for large member lists', async ({
		authenticatedPage,
		supabaseAdmin,
		testData,
		testUser,
	}) => {
		const page = authenticatedPage

		const workspace = await testData.createWorkspace({
			ownerId: testUser.id,
			name: `Large Team Workspace ${Date.now()}`,
		})

		await supabaseAdmin.from('users').update({ display_name: 'Owner User' }).eq('id', testUser.id)

		const memberIds: string[] = []
		for (let i = 1; i <= 15; i++) {
			const email = `member-${i}-${Date.now()}@example.com`
			const displayName = `Test Member ${i}`
			const { data, error } = await supabaseAdmin.auth.admin.createUser({
				email,
				password: 'TestPassword123!',
				email_confirm: true,
				user_metadata: {
					display_name: displayName,
					name: displayName,
				},
			})

			if (error || !data?.user?.id) {
				throw new Error(`Failed to create member ${i}: ${error?.message ?? 'Unknown error'}`)
			}

			await testData.addWorkspaceMember(workspace.id, data.user.id)
			memberIds.push(data.user.id)
		}

		await page.goto(`/workspace/${workspace.id}/members`)

		const searchInput = page.getByPlaceholder('Search members by name or email...')
		await expect(searchInput).toBeVisible()

		await searchInput.fill('Test Member 5')
		await expect(page.getByText('Found 1 member')).toBeVisible()
		await expect(page.getByText('Test Member 5')).toBeVisible()
		await expect(page.getByText('Test Member 6')).toHaveCount(0)

		await searchInput.clear()
		await expect(page.getByText('Page 1 of 2')).toBeVisible()
		await expect(page.getByText('Showing 1 to 10')).toBeVisible()

		await page.getByTestId('pagination-next').click()
		await expect(page.getByText('Page 2 of 2')).toBeVisible()
		await expect(page.getByText('Showing 11 to 16')).toBeVisible()

		await page.getByTestId('pagination-previous').click()
		await expect(page.getByText('Page 1 of 2')).toBeVisible()

		await supabaseAdmin.from('workspaces').delete().eq('id', workspace.id)
		for (const memberId of memberIds) {
			await cleanupUserData(supabaseAdmin, memberId)
			await supabaseAdmin.auth.admin.deleteUser(memberId)
		}
	})
})
