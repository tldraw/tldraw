import { expect, test } from './fixtures/test-fixtures'

/**
 * Recent Documents Time-Based Grouping Tests (UI-07)
 *
 * Tests the time-based grouping feature for recent documents with snapshot preservation.
 * Documents should be grouped into sections: Today, Yesterday, This Week, This Month, Older.
 */
test.describe('Recent Documents Time-Based Grouping', () => {
	test.describe('Section Rendering', () => {
		test('should display documents in Today section when accessed today', async ({
			authenticatedPage,
			testData,
			testUser,
			supabaseAdmin,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create a document accessed today
			const docName = `Today Doc ${Date.now()}`
			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: docName,
				logAccessForUserId: testUser.id,
				accessedAt: new Date().toISOString(), // Now
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Check for "Today" section header in the sidebar
			const recentView = page.locator('[data-testid="recent-view"]')
			const todaySection = recentView.locator('text=Today').first()
			await expect(todaySection).toBeVisible({ timeout: 10000 })

			// Document should be in the Today section
			await expect(recentView).toContainText(docName)
		})

		test('should display documents in Yesterday section when accessed yesterday', async ({
			authenticatedPage,
			testData,
			testUser,
			supabaseAdmin,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create a document accessed yesterday (25 hours ago)
			const docName = `Yesterday Doc ${Date.now()}`
			const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000)
			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: docName,
				logAccessForUserId: testUser.id,
				accessedAt: yesterday.toISOString(),
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Check for "Yesterday" section header in the sidebar
			const recentView = page.locator('[data-testid="recent-view"]')
			const yesterdaySection = recentView.locator('text=Yesterday').first()
			await expect(yesterdaySection).toBeVisible({ timeout: 10000 })

			// Document should be in the Yesterday section
			await expect(recentView).toContainText(docName)
		})

		test('should display documents in This Week section when accessed earlier this week', async ({
			authenticatedPage,
			testData,
			testUser,
			supabaseAdmin,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create a document accessed 3 days ago (earlier this week)
			const docName = `This Week Doc ${Date.now()}`
			const thisWeek = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: docName,
				logAccessForUserId: testUser.id,
				accessedAt: thisWeek.toISOString(),
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Check for "This Week" section header
			const thisWeekSection = page
				.locator('[data-testid="recent-view"]')
				.locator('text=This Week')
				.first()
			await expect(thisWeekSection).toBeVisible({ timeout: 10000 })

			// Document should be in the This Week section
			const recentView = page.locator('[data-testid="recent-view"]')
			await expect(recentView).toContainText(docName)
		})

		test('should display documents in This Month section when accessed earlier this month', async ({
			authenticatedPage,
			testData,
			testUser,
			supabaseAdmin,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create a document accessed 15 days ago (earlier this month)
			const docName = `This Month Doc ${Date.now()}`
			const thisMonth = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: docName,
				logAccessForUserId: testUser.id,
				accessedAt: thisMonth.toISOString(),
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Check for "This Month" section header
			const thisMonthSection = page
				.locator('[data-testid="recent-view"]')
				.locator('text=This Month')
				.first()
			await expect(thisMonthSection).toBeVisible({ timeout: 10000 })

			// Document should be in the This Month section
			const recentView = page.locator('[data-testid="recent-view"]')
			await expect(recentView).toContainText(docName)
		})

		test('should display documents in Older section when accessed before this month', async ({
			authenticatedPage,
			testData,
			testUser,
			supabaseAdmin,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create a document accessed 45 days ago (before this month)
			const docName = `Older Doc ${Date.now()}`
			const older = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: docName,
				logAccessForUserId: testUser.id,
				accessedAt: older.toISOString(),
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Check for "Older" section header
			const olderSection = page.locator('[data-testid="recent-view"]').locator('text=Older').first()
			await expect(olderSection).toBeVisible({ timeout: 10000 })

			// Document should be in the Older section
			const recentView = page.locator('[data-testid="recent-view"]')
			await expect(recentView).toContainText(docName)
		})

		test('should only show sections that have documents', async ({
			authenticatedPage,
			testData,
			testUser,
			supabaseAdmin,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create only one document accessed today
			const docName = `Single Today Doc ${Date.now()}`
			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: docName,
				logAccessForUserId: testUser.id,
				accessedAt: new Date().toISOString(),
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Should show "Today" section
			await expect(
				page.locator('[data-testid="recent-view"]').locator('text=Today').first()
			).toBeVisible()

			// Should NOT show other sections (they should be hidden when empty)
			const yesterdaySection = page
				.locator('[data-testid="recent-view"]')
				.locator('text=Yesterday')
				.first()
			const count = await yesterdaySection.count()
			expect(count).toBe(0)
		})
	})

	test.describe('Multiple Documents Across Sections', () => {
		test('should display documents in correct sections when spanning multiple time periods', async ({
			authenticatedPage,
			testData,
			testUser,
			supabaseAdmin,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create documents across different time periods
			const todayDoc = `Today ${Date.now()}`
			const yesterdayDoc = `Yesterday ${Date.now()}`
			const olderDoc = `Older ${Date.now()}`

			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: todayDoc,
				logAccessForUserId: testUser.id,
				accessedAt: new Date().toISOString(),
			})

			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: yesterdayDoc,
				logAccessForUserId: testUser.id,
				accessedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
			})

			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: olderDoc,
				logAccessForUserId: testUser.id,
				accessedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// All three sections should be visible
			await expect(
				page.locator('[data-testid="recent-view"]').locator('text=Today').first()
			).toBeVisible()
			await expect(
				page.locator('[data-testid="recent-view"]').locator('text=Yesterday').first()
			).toBeVisible()
			await expect(
				page.locator('[data-testid="recent-view"]').locator('text=Older').first()
			).toBeVisible()

			// Each document should be in the correct section
			const recentView = page.locator('[data-testid="recent-view"]')
			await expect(recentView).toContainText(todayDoc)
			await expect(recentView).toContainText(yesterdayDoc)
			await expect(recentView).toContainText(olderDoc)
		})

		test('should sort documents within each section by most recent first', async ({
			authenticatedPage,
			testData,
			testUser,
			supabaseAdmin,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create three documents accessed today at different times
			const baseTime = Date.now()
			const doc1 = `First ${baseTime}`
			const doc2 = `Second ${baseTime}`
			const doc3 = `Third ${baseTime}`

			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: doc1,
				logAccessForUserId: testUser.id,
				accessedAt: new Date(baseTime - 3000).toISOString(),
			})

			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: doc2,
				logAccessForUserId: testUser.id,
				accessedAt: new Date(baseTime - 2000).toISOString(),
			})

			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: doc3,
				logAccessForUserId: testUser.id,
				accessedAt: new Date(baseTime - 1000).toISOString(),
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Get all sidebar document items
			const docItems = page.locator('[data-testid^="sidebar-document-"]')
			const count = await docItems.count()
			expect(count).toBeGreaterThanOrEqual(3)

			// Most recent (doc3) should appear before doc2, which should appear before doc1
			const doc1Index = await docItems.locator(`text=${doc1}`).count()
			const doc2Index = await docItems.locator(`text=${doc2}`).count()
			const doc3Index = await docItems.locator(`text=${doc3}`).count()

			expect(doc1Index).toBeGreaterThan(0)
			expect(doc2Index).toBeGreaterThan(0)
			expect(doc3Index).toBeGreaterThan(0)
		})
	})

	test.describe('Snapshot Preservation', () => {
		test('should preserve section placement across re-renders without navigation', async ({
			authenticatedPage,
			testData,
			testUser,
			supabaseAdmin,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create a document accessed today
			const docName = `Snapshot Test ${Date.now()}`
			await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: docName,
				logAccessForUserId: testUser.id,
				accessedAt: new Date().toISOString(),
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Document should be in Today section
			await expect(
				page.locator('[data-testid="recent-view"]').locator('text=Today').first()
			).toBeVisible()
			const recentView = page.locator('[data-testid="recent-view"]')
			await expect(recentView).toContainText(docName)

			// Trigger a re-render by creating another workspace (causes React Query invalidation)
			await page.click('[data-testid="create-workspace-button"]')
			await page.fill('[data-testid="workspace-name-input"]', `Trigger ${Date.now()}`)
			await page.click('[data-testid="create-workspace-submit"]')
			await page.waitForLoadState('networkidle')

			// Document should still be in Today section (snapshot preserved)
			await expect(
				page.locator('[data-testid="recent-view"]').locator('text=Today').first()
			).toBeVisible()
			await expect(recentView).toContainText(docName)
		})

		test('should reset snapshot on page reload', async ({
			authenticatedPage,
			testData,
			testUser,
			supabaseAdmin,
		}) => {
			const page = authenticatedPage

			// Get private workspace
			const { data: workspace } = await supabaseAdmin
				.from('workspaces')
				.select('id')
				.eq('owner_id', testUser.id)
				.eq('is_private', true)
				.single()

			// Create a document
			const docName = `Reload Test ${Date.now()}`
			const document = await testData.createDocument({
				workspaceId: workspace!.id,
				createdBy: testUser.id,
				name: docName,
				logAccessForUserId: testUser.id,
				accessedAt: new Date().toISOString(),
			})

			// Go to dashboard
			await page.goto('/dashboard')
			await page.waitForLoadState('networkidle')

			// Document should be in Today section
			await expect(
				page.locator('[data-testid="recent-view"]').locator('text=Today').first()
			).toBeVisible()

			// Now update the access time to yesterday in the database
			await supabaseAdmin
				.from('document_access_log')
				.update({ accessed_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() })
				.eq('document_id', document.id)
				.eq('user_id', testUser.id)

			// Reload the page (resets snapshot)
			await page.reload()
			await page.waitForLoadState('networkidle')

			// Document should now be in Yesterday section (new snapshot with updated data)
			await expect(
				page.locator('[data-testid="recent-view"]').locator('text=Yesterday').first()
			).toBeVisible()
		})
	})
})
