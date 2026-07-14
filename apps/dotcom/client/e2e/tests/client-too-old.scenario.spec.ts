import { expect, test } from '../fixtures/scenario-test'

test.describe.configure({ mode: 'parallel' })

test.describe('client version scenarios', () => {
	test('owner recovers when the backend drops support for the current client version', async ({
		owner,
		scenario,
	}) => {
		await owner.editor.isLoaded()
		const reloadButton = owner.page.locator('button:has-text("Reload")')

		try {
			await scenario.downgradeClient(owner)
			await expect(owner.page.getByText('Please reload the page')).toBeVisible()
			await expect(reloadButton).toBeVisible()
		} finally {
			await scenario.upgradeClient(owner)
		}

		await reloadButton.click()
		await owner.editor.isLoaded()
		await owner.editor.ensureSidebarOpen()
		await owner.sidebar.createFileButton.click()
	})
})
