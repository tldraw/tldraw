import fs from 'fs'
import path from 'path'
import { openNewTab } from '../fixtures/helpers'
import { expect, test } from '../fixtures/tla-test'

test.beforeEach(async ({ context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write'])
})

/* --------------------- Sharing -------------------- */

test.describe('logged in user on own file', () => {
	test('default share state', async ({ shareMenu }) => {
		await shareMenu.open()
		expect(await shareMenu.isToggleChecked()).toBe(true)
		expect(await shareMenu.getShareType()).toBe('Editor')
	})

	test('tabs work correctly', async ({ shareMenu }) => {
		await shareMenu.open()
		expect(await shareMenu.publishTabButton.isVisible()).toBe(true)
		expect(await shareMenu.inviteTabButton.isVisible()).toBe(true)
		expect(await shareMenu.exportTabButton.isVisible()).toBe(true)
		expect(await shareMenu.anonShareTabButton.isVisible()).toBe(false)

		expect(await shareMenu.publishTabPage.isVisible()).toBe(false)
		expect(await shareMenu.inviteTabPage.isVisible()).toBe(true)
		expect(await shareMenu.exportTabPage.isVisible()).toBe(false)
		expect(await shareMenu.anonShareTabPage.isVisible()).toBe(false)

		// Starts on the invite tab
		expect(await shareMenu.inviteTabPage.isVisible()).toBe(true)
		expect(await shareMenu.exportTabPage.isVisible()).toBe(false)
		expect(await shareMenu.publishTabPage.isVisible()).toBe(false)
		expect(await shareMenu.anonShareTabPage.isVisible()).toBe(false)

		// Can switch between tabs (export)
		await shareMenu.exportTabButton.click()
		expect(await shareMenu.inviteTabPage.isVisible()).toBe(false)
		expect(await shareMenu.exportTabPage.isVisible()).toBe(true)
		expect(await shareMenu.publishTabPage.isVisible()).toBe(false)

		// Can switch between tabs (publish)
		await shareMenu.publishTabButton.click()
		expect(await shareMenu.inviteTabPage.isVisible()).toBe(false)
		expect(await shareMenu.exportTabPage.isVisible()).toBe(false)
		expect(await shareMenu.publishTabPage.isVisible()).toBe(true)
	})

	test('can unshare and reshare', async ({ page, browser, shareMenu }) => {
		// Copy the link to the current file
		await shareMenu.open()
		expect(await shareMenu.isInviteButtonVisible()).toBe(true)
		const url = await shareMenu.copyLink()

		// Open link in an incognito window
		const { newPage, newShareMenu, newContext } = await openNewTab(browser, {
			url,
			allowClipboard: true,
			userProps: undefined,
		})

		// The second page should have the share button and not the error
		await expect(newShareMenu.shareButton).toBeVisible()
		await expect(newPage.getByTestId('tla-error-icon')).not.toBeVisible()

		// Now unshare it it...
		await page.getByTestId('shared-link-shared-switch').click()
		expect(await shareMenu.isToggleChecked()).toBe(false)

		// Reload the second page
		newPage.reload()

		// The second page should have an error and not the share button
		await expect(newShareMenu.shareButton).not.toBeVisible()
		await expect(newPage.getByTestId('tla-error-icon')).toBeVisible()

		// Now reshare it...
		await page.getByTestId('shared-link-shared-switch').click()
		expect(await shareMenu.isToggleChecked()).toBe(true)

		// Reload the second page again
		newPage.reload()

		// The second page should have the share button and not the error again
		await expect(newShareMenu.shareButton).toBeVisible()
		await expect(newPage.getByTestId('tla-error-icon')).not.toBeVisible()

		await newContext.close()
	})

	test('can switch share permissions between editor and viewer', async ({
		page,
		browser,
		shareMenu,
	}) => {
		// Copy the link to the current file
		await shareMenu.open()

		// The permission should be editor by default...
		await expect(page.getByTestId('shared-link-type-select')).toHaveText('Editor')

		// Copy the share link
		expect(await shareMenu.isInviteButtonVisible()).toBe(true)
		const url = await shareMenu.copyLink()

		// Open link in an incognito window
		const { newPage, newContext } = await openNewTab(browser, {
			url,
			allowClipboard: true,
			userProps: undefined,
		})

		// The second page should be in editor mode
		await expect(newPage.getByTestId('tools.draw')).toBeVisible()

		// Now set the permission to viewer...
		await page.getByTestId('shared-link-type-select').click()
		await page.getByRole('option', { name: 'Viewer' }).click()
		await expect(page.getByTestId('shared-link-type-select')).toHaveText('Viewer')

		// Reload the second page
		newPage.reload()

		// The second page should be in readonly mode
		await expect(newPage.getByTestId('tools.draw')).not.toBeVisible()

		// Now reshare it...
		await page.getByTestId('shared-link-type-select').click()
		await page.getByRole('option', { name: 'Editor' }).click()
		await expect(page.getByTestId('shared-link-type-select')).toHaveText('Editor')

		// Reload the second page again
		newPage.reload()

		// The second page should be back in editor mode
		await expect(newPage.getByTestId('tools.draw')).toBeVisible()

		await newContext.close()
	})

	test('can publish and unpublish', async ({ shareMenu, browser }) => {
		// Publish the user's current file
		await shareMenu.open()
		expect(await shareMenu.isInviteButtonVisible()).toBe(true)
		await shareMenu.publishFile()
		const url = await shareMenu.copyLink()

		// Open published file link in an incognito window
		const { newPage, newShareMenu, newContext } = await openNewTab(browser, {
			url,
			allowClipboard: true,
			userProps: { user: 'huppy', index: test.info().parallelIndex },
		})

		await expect(newShareMenu.shareButton).toBeVisible()

		// Now unpublish it...

		await shareMenu.unpublishFile()

		newPage.reload()

		// Open published file link in an incognito window

		await expect(newShareMenu.shareButton).not.toBeVisible()

		await expect(newPage.getByTestId('tla-error-icon')).toBeVisible()

		await newContext.close()
	})

	test('can publish changes', async ({ page, shareMenu, browser }) => {
		// Publish the user's current project
		await shareMenu.open()
		await shareMenu.publishFile()
		const url = await shareMenu.copyLink()

		// Open published project link in an incognito window
		const newTab1 = await openNewTab(browser, {
			url,
			allowClipboard: true,
			userProps: undefined,
		})

		await expect(newTab1.newShareMenu.shareButton).toBeVisible()
		await newTab1.newShareMenu.open()

		// should see an empty page...
		await newTab1.newEditor.expectShapesCount(0)
		await newTab1.newContext.close()

		// Back on the published project, add a shape
		await page.getByTestId('tools.rectangle').click()
		await page.locator('.tl-background').click()

		// Open in a second new tab
		const newTab2 = await openNewTab(browser, {
			url,
			allowClipboard: true,
			userProps: undefined,
		})

		// published project should still be zero
		await newTab2.newEditor.expectShapesCount(0)
		await newTab2.newContext.close()

		// Back on the published project... publish the changes
		await shareMenu.open()
		await shareMenu.publishChanges()

		// Open published project in a third new tab
		const newTab3 = await openNewTab(browser, {
			url,
			allowClipboard: true,
			userProps: undefined,
		})

		// published project should now have one shape
		await newTab3.newEditor.expectShapesCount(1)
		await newTab3.newContext.close()
	})
})

test.describe('logged in user on someone elses file', () => {
	test.fixme('todo', () => {})
})

test.describe('logged in user on published file', () => {
	test('tabs work correctly', async ({ shareMenu, browser }) => {
		// Publish the user's current file
		await shareMenu.open()
		expect(await shareMenu.isInviteButtonVisible()).toBe(true)
		await shareMenu.publishFile()
		const url = await shareMenu.copyLink()

		// Open published file link in an incognito window
		const { newShareMenu, newContext } = await openNewTab(browser, {
			url,
			allowClipboard: true,
			userProps: { user: 'huppy', index: test.info().parallelIndex },
		})

		await expect(newShareMenu.shareButton).toBeVisible()
		await newShareMenu.open()

		expect(await newShareMenu.publishTabButton.isVisible()).toBe(false)
		expect(await newShareMenu.inviteTabButton.isVisible()).toBe(false)
		expect(await newShareMenu.exportTabButton.isVisible()).toBe(true)
		expect(await newShareMenu.anonShareTabButton.isVisible()).toBe(true)

		expect(await newShareMenu.publishTabPage.isVisible()).toBe(false)
		expect(await newShareMenu.inviteTabPage.isVisible()).toBe(false)
		expect(await newShareMenu.exportTabPage.isVisible()).toBe(false)
		expect(await newShareMenu.anonShareTabPage.isVisible()).toBe(true) // show anon share tab page

		// can copy the url
		const copiedUrl = await newShareMenu.copyLink()
		expect(copiedUrl).toBe(url)

		// Switch to the export share tab
		await newShareMenu.exportTabButton.click()
		expect(await newShareMenu.exportTabPage.isVisible()).toBe(true)
		expect(await newShareMenu.anonShareTabPage.isVisible()).toBe(false)

		await newContext.close()
	})
})

test.describe('logged out user on scratch file', () => {
	test('tabs work correctly', async ({ browser }) => {
		const { newShareMenu, newContext } = await openNewTab(browser, {
			allowClipboard: true,
			userProps: undefined,
		})

		// In the incognito window, we are on the scratchpad
		await expect(newShareMenu.shareButton).toBeVisible()
		await newShareMenu.open()
		expect(await newShareMenu.inviteTabButton.isVisible()).toBe(false)
		expect(await newShareMenu.exportTabButton.isVisible()).toBe(true)
		expect(await newShareMenu.publishTabButton.isVisible()).toBe(false)
		expect(await newShareMenu.anonShareTabButton.isVisible()).toBe(false) // not shown on scratch

		await newContext.close()
	})
})

test.describe('logged out user on guest file', () => {
	test('tabs work correctly', async ({ shareMenu, browser }) => {
		// Share the logged in user's current file
		await shareMenu.open()
		expect(await shareMenu.isInviteButtonVisible()).toBe(true)
		await shareMenu.shareFile()
		const url = await shareMenu.copyLink()

		// Open file link in an incognito window
		const { newShareMenu, newContext } = await openNewTab(browser, {
			url,
			allowClipboard: true,
			userProps: undefined,
		})

		await expect(newShareMenu.shareButton).toBeVisible()
		await newShareMenu.open()

		expect(await newShareMenu.publishTabButton.isVisible()).toBe(false)
		expect(await newShareMenu.inviteTabButton.isVisible()).toBe(false)
		expect(await newShareMenu.exportTabButton.isVisible()).toBe(true)
		expect(await newShareMenu.anonShareTabButton.isVisible()).toBe(true)

		expect(await newShareMenu.publishTabPage.isVisible()).toBe(false)
		expect(await newShareMenu.inviteTabPage.isVisible()).toBe(false)
		expect(await newShareMenu.exportTabPage.isVisible()).toBe(false)
		expect(await newShareMenu.anonShareTabPage.isVisible()).toBe(true) // show anon share tab page

		// can copy the url
		const copiedUrl = await shareMenu.copyLink()
		expect(copiedUrl).toBe(url)

		// Switch to the export share tab
		await newShareMenu.exportTabButton.click()
		expect(await newShareMenu.exportTabPage.isVisible()).toBe(true)
		expect(await newShareMenu.anonShareTabPage.isVisible()).toBe(false)

		await newContext.close()
	})
})

test.describe('logged out user on published file', () => {
	test('tabs work correctly', async ({ shareMenu, browser }) => {
		// Publish the user's current file
		await shareMenu.open()
		expect(await shareMenu.isInviteButtonVisible()).toBe(true)
		await shareMenu.publishFile()
		const url = await shareMenu.copyLink()

		// Open published file link in an incognito window
		const { newShareMenu, newContext } = await openNewTab(browser, {
			url,
			allowClipboard: true,
			userProps: undefined,
		})

		await expect(newShareMenu.shareButton).toBeVisible()
		await newShareMenu.open()

		expect(await newShareMenu.publishTabButton.isVisible()).toBe(false)
		expect(await newShareMenu.inviteTabButton.isVisible()).toBe(false)
		expect(await newShareMenu.exportTabButton.isVisible()).toBe(true)
		expect(await newShareMenu.anonShareTabButton.isVisible()).toBe(true)

		expect(await newShareMenu.publishTabPage.isVisible()).toBe(false)
		expect(await newShareMenu.inviteTabPage.isVisible()).toBe(false)
		expect(await newShareMenu.exportTabPage.isVisible()).toBe(false)
		expect(await newShareMenu.anonShareTabPage.isVisible()).toBe(true) // show anon share tab page

		// can copy the url
		const copiedUrl = await shareMenu.copyLink()
		expect(copiedUrl).toBe(url)

		// Switch to the export share tab
		await newShareMenu.exportTabButton.click()
		expect(await newShareMenu.exportTabPage.isVisible()).toBe(true)
		expect(await newShareMenu.anonShareTabPage.isVisible()).toBe(false)

		await newContext.close()
	})
})

/* ------------------- Exporting ------------------- */
test('can export a file as an image', async ({ page, shareMenu }) => {
	await page.getByTestId('tools.rectangle').click()
	await page.locator('.tl-background').click()
	const downloadPromise = page.waitForEvent('download')

	await shareMenu.open()
	await shareMenu.exportFile()
	const download = await downloadPromise
	const suggestedFilename = download.suggestedFilename()
	expect(suggestedFilename).toMatch('file.png')
	const filePath = path.join('./test-results/', suggestedFilename)
	await download.saveAs(filePath)

	expect(fs.existsSync(filePath)).toBeTruthy()
	const stats = fs.statSync(filePath)
	expect(stats.size).toBeGreaterThan(0)
})
