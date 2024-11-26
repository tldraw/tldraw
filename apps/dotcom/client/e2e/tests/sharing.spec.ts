import { Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { ShareMenu } from '../fixtures/ShareMenu'
import { areUrlsEqual, openNewIncognitoPage } from '../fixtures/helpers'
import { expect, test } from '../fixtures/tla-test'

test.beforeEach(async ({ context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write'])
})

/* --------------------- Sharing -------------------- */

async function shareFileAndCopyLink(
	page: Page,
	shareMenu: ShareMenu,
	shareAction: () => Promise<void>
) {
	await shareMenu.open()
	expect(await shareMenu.isInviteButtonVisible()).toBe(true)
	await shareAction()
	return await shareMenu.copyLink()
}

const users = [
	{ user: undefined, sameFileName: false, description: 'anon users' },
	{ user: 'suppy' as const, sameFileName: true, description: 'logged in users' },
]

test.describe('default share state', () => {
	test('is public and editable', async ({ shareMenu }) => {
		await shareMenu.open()
		expect(await shareMenu.isInviteButtonVisible()).toBe(true)
		expect(await shareMenu.isToggleChecked()).toBe(true)
		expect(await shareMenu.getShareType()).toBe('Editor')
	})
})

test.describe('shared files', () => {
	users.map((u) => {
		test(`can be seen by ${u.description}`, async ({ page, browser, shareMenu, editor }) => {
			const { url, fileName, userProps } = await test.step('Share file', async () => {
				const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)
				const fileName = await editor.getCurrentFileName()
				const index = test.info().parallelIndex
				const userProps = u.user ? { user: u.user, index } : undefined
				return { url, fileName, userProps }
			})

			const { newContext, newPage, newEditor } = await openNewIncognitoPage(browser, {
				url,
				userProps,
			})
			// We are in a multiplayer room with another person
			await expect(page.getByRole('button', { name: 'People' })).toBeVisible()

			await expect(newPage.getByRole('heading', { name: 'Not found' })).not.toBeVisible()
			expect(await newEditor.getCurrentFileName()).toBe(u.sameFileName ? fileName : 'New board')
			await newContext.close()
		})

		test(`can be unshared for ${u.description}`, async ({ page, browser, shareMenu }) => {
			const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)

			const index = test.info().parallelIndex
			const userProps = u.user ? { user: u.user, index } : undefined
			const { newContext, errorPage } = await openNewIncognitoPage(browser, {
				url,
				userProps,
			})

			await shareMenu.unshareFile()
			await errorPage.expectPrivateFileVisible()
			await newContext.close()
		})
	})
	test('logged in users can copy shared links', async ({ page, browser, shareMenu }) => {
		const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)
		const index = test.info().parallelIndex

		const { newPage, newShareMenu, newContext } = await openNewIncognitoPage(browser, {
			url,
			userProps: {
				user: 'huppy' as const,
				index,
			},
			allowClipboard: true,
		})
		// we have to wait a bit for the search params to get populated
		await newPage.waitForTimeout(500)
		const otherUserUrl = await newShareMenu.openShareMenuAndCopyInviteLink()
		expect(areUrlsEqual(otherUserUrl, url)).toBe(true)
		await newContext.close()
	})

	test('anon users can copy shared links', async ({ page, browser, shareMenu }) => {
		const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.shareFile)

		const { newShareMenu, newContext } = await openNewIncognitoPage(browser, {
			url,
			allowClipboard: true,
			userProps: undefined,
		})
		await expect(newShareMenu.shareButton).toBeVisible()
		await newShareMenu.openShareMenuAndCopyInviteLink()
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

/* ------------------- Publishing ------------------- */

test.describe('published files', () => {
	users.map((u) => {
		test(`can be seen by ${u.description}`, async ({ page, browser, shareMenu }) => {
			const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
			expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

			const index = test.info().parallelIndex
			const userProps = u.user ? { user: u.user, index } : undefined

			const { newContext, newPage, newHomePage, errorPage } = await openNewIncognitoPage(browser, {
				url,
				userProps,
			})
			await errorPage.expectNotFoundNotVisible()
			if (!userProps) await newHomePage.expectSignInButtonVisible()
			expect(areUrlsEqual(url, newPage.url())).toBe(true)
			await newContext.close()
		})

		test.only(`can only be unpublished by owner (testing ${u.description})`, async ({
			page,
			browser,
			context,
			shareMenu,
		}) => {
			if (u.user) {
				// logged in user
				const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
				expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)
				const index = test.info().parallelIndex
				const userProps = { user: u.user, index }
				const { newContext, newPage, errorPage } = await openNewIncognitoPage(browser, {
					url,
					userProps,
				})
				await errorPage.expectNotFoundNotVisible()
				await shareMenu.unpublishFile()
				await newPage.reload()
				await errorPage.expectNotFoundVisible()
				await newContext.close()
			} else {
				// anon user
				// open the share menu
				await shareMenu.open()
				// expect the publish button to be hidden
				expect(await shareMenu.publishButton.isHidden()).toBe(true)
				await context.close()
			}
		})

		test(`${u.description} can copy a published file link`, async ({
			page,
			browser,
			shareMenu,
		}) => {
			const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
			expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)

			const index = test.info().parallelIndex
			const userProps = u.user ? { user: u.user, index } : undefined
			const { newPage, newShareMenu, newContext } = await openNewIncognitoPage(browser, {
				url,
				userProps,
				allowClipboard: true,
			})
			// we have to wait a bit for the search params to get populated
			await newPage.waitForTimeout(500)
			const otherUserUrl = await newShareMenu.openShareMenuAndCopyPublishedLink()
			expect(areUrlsEqual(otherUserUrl, url)).toBe(true)
			await newContext.close()
		})
	})

	test('can be updated', async ({ page, browser, editor, shareMenu }) => {
		const url = await test.step('Create a shape and publish file', async () => {
			await page.getByTestId('tools.rectangle').click()
			await page.locator('.tl-background').click()
			await editor.expectShapesCount(1)
			const url = await shareFileAndCopyLink(page, shareMenu, shareMenu.publishFile)
			expect(url).toMatch(/http:\/\/localhost:3000\/q\/p\//)
			return url
		})

		const { newContext, newPage, newHomePage, newEditor } = await openNewIncognitoPage(browser, {
			url,
			userProps: undefined,
		})
		await newHomePage.isLoaded()
		await newEditor.expectShapesCount(1)

		await test.step('Update the document (duplicate the shape)', async () => {
			await page.getByTestId('quick-actions.duplicate').click()

			// lets reload to make sure the change would have time to propagate
			await newPage.reload()
			await newHomePage.isLoaded()
			// We haven't published changes yet, so the new page should still only see one shape
			await newEditor.expectShapesCount(1)
		})

		await test.step('Publish the changes and check for updates', async () => {
			await shareMenu.open()
			await shareMenu.publishChanges()
			await newPage.reload()
			await newHomePage.isLoaded()
			await newEditor.expectShapesCount(2)
			await newContext.close()
		})
	})
})
