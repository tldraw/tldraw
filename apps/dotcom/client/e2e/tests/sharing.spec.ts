import { Page } from '@playwright/test'
import { ShareMenu } from '../fixtures/ShareMenu'
import { openNewIncognitoPage } from '../fixtures/helpers'
import { expect, test } from '../fixtures/tla-test'

test.beforeEach(async ({ homePage, context }) => {
	await homePage.goto()
	await homePage.isLoaded()
	await context.grantPermissions(['clipboard-read', 'clipboard-write'])
})

test.afterEach(async ({ database }) => {
	await database.reset()
})

/* --------------------- Sharing -------------------- */

async function shareFileAndCopyLink(
	page: Page,
	shareMenu: ShareMenu,
	shareAction: () => Promise<void>
) {
	await shareMenu.open()
	expect(await shareMenu.isVisible()).toBe(true)
	await shareAction()
	await shareMenu.copyLink()
	const handle = await page.evaluateHandle(() => navigator.clipboard.readText())
	return await handle.jsonValue()
}

test('can share a file', async ({ page, browser, shareMenu }) => {
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)
	const { newContext, newPage, newHomePage } = await openNewIncognitoPage(browser, url)
	await newHomePage.isLoaded()
	// We are in a multiplayer room with another person
	await expect(page.getByRole('button', { name: 'People' })).toBeVisible()
	await expect(newPage.getByRole('heading', { name: 'Not found' })).not.toBeVisible()
	await newContext.close()
})

test('can unshare a file', async ({ page, browser, shareMenu }) => {
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)

	const { newContext, newHomePage, errorPage } = await openNewIncognitoPage(browser, url)
	await newHomePage.isLoaded()

	await shareMenu.unshareFile()
	await errorPage.expectPrivateFileVisible()
	await newContext.close()
})

test('can copy a shared file link', async ({ page, shareMenu }) => {
	// we have to wait a bit for the search params to get populated
	await page.waitForTimeout(500)
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)
	const currentUrl = await page.evaluate('window.location.href')
	expect(url).toBe(currentUrl)
})

/* ------------------- Publishing ------------------- */

test('can publish a file', async ({ page, browser, shareMenu }) => {
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
	expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

	const { newContext, newHomePage, errorPage } = await openNewIncognitoPage(browser, url)
	await newHomePage.isLoaded()
	await errorPage.expectNotFoundNotVisible()
	await newContext.close()
})

test('can unpublish a file', async ({ page, browser, shareMenu }) => {
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
	expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

	const { newContext, newPage, newHomePage, errorPage } = await openNewIncognitoPage(browser, url)
	await newHomePage.isLoaded()
	await errorPage.expectNotFoundNotVisible()
	await shareMenu.unpublishFile()
	await newPage.reload()
	await errorPage.expectNotFoundVisible()
	await newContext.close()
})

test('can update published file', async ({ page, browser, editor, shareMenu }) => {
	await page.getByTestId('tools.rectangle').click()
	await page.locator('.tl-background').click()
	expect(await editor.getNumberOfShapes()).toBe(1)
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
	expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

	const { newContext, newPage, newHomePage, newEditor } = await openNewIncognitoPage(browser, url)
	await newHomePage.isLoaded()
	expect(await newEditor.getNumberOfShapes()).toBe(1)

	await page.getByTestId('quick-actions.duplicate').click()

	// lets reload to make sure the change would have time to propagate
	await newPage.reload()
	await newHomePage.isLoaded()
	// The main editor should have two shapes
	expect(await editor.getNumberOfShapes()).toBe(2)
	// We haven't published changes yet, so the new page should still only see one shape
	expect(await newEditor.getNumberOfShapes()).toBe(1)

	await shareMenu.open()
	await shareMenu.publishChanges()
	await newPage.reload()
	await newHomePage.isLoaded()
	expect(await newEditor.getNumberOfShapes()).toBe(2)
	await newContext.close()
})

test('can copy a published file link', async ({ page, shareMenu }) => {
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
	expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)
})
