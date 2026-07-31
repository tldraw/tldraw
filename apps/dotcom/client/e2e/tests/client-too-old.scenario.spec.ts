import { expect, test } from '../fixtures/scenario-test'

test.describe.configure({ mode: 'parallel' })

test.describe('client version scenarios', () => {
	test('owner recovers when Zero reports the client is too old', async ({ owner }) => {
		await owner.editor.isLoaded()
		const reloadButton = owner.page.locator('button:has-text("Reload")')

		// Zero (not our own backend) owns "client too old" detection: it fires `onUpdateNeeded` when
		// the client's schema/protocol falls behind what zero-cache supports. There's no supported way
		// to force that mismatch from a test, so this triggers the same `onClientTooOld` callback the
		// Zero client would call, and verifies the UI + reload-recovery flow that callback protects.
		await owner.page.evaluate(() => {
			;(window as any).app.__test__triggerClientTooOld()
		})
		await expect(owner.page.getByText('Please reload the page')).toBeVisible()
		await expect(reloadButton).toBeVisible()

		await reloadButton.click()
		await owner.editor.isLoaded()
		await owner.editor.ensureSidebarOpen()
		await owner.sidebar.createFileButton.click()
	})
})
