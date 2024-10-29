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

test('can share a file', async ({ page, sidebar, editor, browser, shareMenu }) => {
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)
	const { newContext, newPage, newHomePage } = await openNewIncognitoPage(
		browser,
		editor,
		sidebar,
		url
	)
	await newHomePage.isLoaded()
	// We are in a multiplayer room with another person
	await expect(page.getByRole('button', { name: 'People' })).toBeVisible()
	await expect(newPage.getByRole('heading', { name: 'Not found' })).not.toBeVisible()
	await newContext.close()
})

test('can unshare a file', async ({ page, browser, sidebar, editor, shareMenu }) => {
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)

	const { newContext, newPage, newHomePage } = await openNewIncognitoPage(
		browser,
		editor,
		sidebar,
		url
	)
	await newHomePage.isLoaded()

	await shareMenu.unshareFile()

	await expect(newPage.getByRole('heading', { name: 'Private file' })).toBeVisible()
	await newContext.close()
})

test('can publish a file', async ({ page, browser, editor, sidebar, shareMenu }) => {
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
	expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

	const { newContext, newPage, newHomePage } = await openNewIncognitoPage(
		browser,
		editor,
		sidebar,
		url
	)
	await newHomePage.isLoaded()
	await expect(newPage.getByRole('heading', { name: 'Not found' })).not.toBeVisible()
	await newContext.close()
})

test.only('can unpublish a file', async ({ page, browser, editor, sidebar, shareMenu }) => {
	const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
	expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

	const { newContext, newPage, newHomePage } = await openNewIncognitoPage(
		browser,
		editor,
		sidebar,
		url
	)
	await newHomePage.isLoaded()
	await expect(newPage.getByRole('heading', { name: 'Page not found' })).not.toBeVisible()
	await shareMenu.unpublishFile()
	await newPage.reload()
	await expect(newPage.getByRole('heading', { name: 'Page not found' })).toBeVisible()
	await newContext.close()
})
