import { expect, test } from '../fixtures/tla-test'

test('if the backend drops support for the current client version', async ({
	page,
	editor,
	sidebar,
	database,
}) => {
	await editor.isLoaded()
	const id = await database.getUserId()
	const reloadButton = page.locator('button:has-text("Reload")')
	try {
		await fetch(`http://localhost:3000/api/app/__test__/user/${id}/downgrade-client`)
		await expect(page.getByText('Please reload the page')).toBeVisible()
		await expect(reloadButton).toBeVisible()
	} finally {
		await fetch(`http://localhost:3000/api/app/__test__/user/${id}/upgrade-client`)
	}
	await reloadButton.click()
	await editor.isLoaded()
	await sidebar.createFileButton.click()
})
