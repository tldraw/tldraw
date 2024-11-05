import { Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { USER_2 } from '../consts'
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

const users = [
	{ email: USER_2, sameFileName: true },
	{ email: undefined, sameFileName: false },
]

function getUserDescription(email: string | undefined) {
	return email ? 'logged in users' : 'anon users'
}

test.describe('shared files', () => {
	users.map((user) => {
		test(`can be seen by ${getUserDescription(user.email)}`, async ({
			page,
			browser,
			shareMenu,
			editor,
		}) => {
			const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)
			const fileName = await editor.getCurrentFileName()
			const { newContext, newPage, newEditor } = await openNewIncognitoPage(browser, {
				url,
				asUser: user.email,
			})
			// We are in a multiplayer room with another person
			await expect(page.getByRole('button', { name: 'People' })).toBeVisible()
			await expect(newPage.getByRole('button', { name: 'People' })).toBeVisible()

			await expect(newPage.getByRole('heading', { name: 'Not found' })).not.toBeVisible()
			expect(await newEditor.getCurrentFileName()).toBe(user.sameFileName ? fileName : 'New board')
			await newContext.close()
		})

		test(`can be unshared for ${getUserDescription(user.email)}`, async ({
			page,
			browser,
			shareMenu,
		}) => {
			const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)

			const { newContext, errorPage } = await openNewIncognitoPage(browser, {
				url,
				asUser: user.email,
			})

			await shareMenu.unshareFile()
			await errorPage.expectPrivateFileVisible()
			await newContext.close()
		})
	})
	test('logged in users can copy shared links', async ({ page, browser, shareMenu }) => {
		const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)

		const { newPage, newShareMenu } = await openNewIncognitoPage(browser, {
			url,
			asUser: USER_2,
			allowClipboard: true,
		})
		// we have to wait a bit for the search params to get populated
		await newPage.waitForTimeout(500)
		const otherUserUrl = await newShareMenu.openMenuCopyLinkAndReturnUrl()
		expect(otherUserUrl).toBe(newPage.url())
	})

	test('anon users can copy shared links', async ({ page, browser, shareMenu }) => {
		const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)

		const { newShareMenu } = await openNewIncognitoPage(browser, {
			url,
			allowClipboard: true,
		})
		await expect(newShareMenu.shareButton).not.toBeVisible()
	})
})

/* ------------------- Exporting ------------------- */
test.only('can export a file as an image', async ({ page, shareMenu }) => {
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

/* ------------------- Publishing ------------------- */

test.describe('published files', () => {
	users.map((user) => {
		test(`can be seen by ${getUserDescription(user.email)}`, async ({
			page,
			browser,
			shareMenu,
		}) => {
			const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
			expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

			const { newContext, newPage, newHomePage, errorPage } = await openNewIncognitoPage(browser, {
				url,
				asUser: user.email,
			})
			await errorPage.expectNotFoundNotVisible()
			if (!user.email) await newHomePage.expectSignInButtonVisible()
			expect(newPage.url()).toBe(url)
			await newContext.close()
		})

		test(`can be unpublished for ${getUserDescription(user.email)}`, async ({
			page,
			browser,
			shareMenu,
		}) => {
			const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
			expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

			const { newContext, newPage, newHomePage, errorPage } = await openNewIncognitoPage(browser, {
				url,
				asUser: user.email,
			})
			if (!user.email) await newHomePage.expectSignInButtonVisible()
			await errorPage.expectNotFoundNotVisible()
			await shareMenu.unpublishFile()
			await newPage.reload()
			await errorPage.expectNotFoundVisible()
			await newContext.close()
		})

		test(`${getUserDescription(user.email)} can copy a published file link`, async ({
			page,
			browser,
			shareMenu,
		}) => {
			const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
			expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

			const { newPage, newShareMenu } = await openNewIncognitoPage(browser, {
				url,
				asUser: user.email,
				allowClipboard: true,
			})
			// we have to wait a bit for the search params to get populated
			await newPage.waitForTimeout(500)
			const otherUserUrl = await newShareMenu.openMenuCopyLinkAndReturnUrl()
			expect(otherUserUrl).toBe(newPage.url())
		})
	})

	test('can be updated', async ({ page, browser, editor, shareMenu }) => {
		await page.getByTestId('tools.rectangle').click()
		await page.locator('.tl-background').click()
		expect(await editor.getNumberOfShapes()).toBe(1)
		const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
		expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

		const { newContext, newPage, newHomePage, newEditor } = await openNewIncognitoPage(browser, {
			url,
		})
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
})
