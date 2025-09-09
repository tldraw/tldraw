import { Browser, BrowserContext, Page, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { Editor } from './Editor'
import { ErrorPage } from './ErrorPages'
import { HomePage } from './HomePage'
import { ShareMenu } from './ShareMenu'
import { Sidebar } from './Sidebar'

export type UserName = 'huppy' | 'suppy'
type UserProps = { user: UserName; index: number } | undefined

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function openNewTab(
	browser: Browser,
	opts: { url?: string; userProps: UserProps; allowClipboard?: boolean }
) {
	return await test.step('open new incognito page', async () => {
		const { url, userProps, allowClipboard } = opts
		let newContext: BrowserContext
		if (userProps === undefined) {
			newContext = await browser.newContext({ storageState: undefined })
		} else {
			const storageStateFileName = getStorageStateFileName(userProps.index, userProps.user)
			const storageState = JSON.parse(fs.readFileSync(storageStateFileName, 'utf-8'))
			newContext = await browser.newContext({ storageState })
		}

		if (allowClipboard) {
			await newContext.grantPermissions(['clipboard-read', 'clipboard-write'])
		}
		const newPage = await newContext.newPage()
		const { newEditor, newHomePage, newShareMenu, errorPage } = createFixtures(newPage)
		if (url) {
			await newPage.goto(url)
		} else {
			await newHomePage.goto()
		}

		await newHomePage.isLoaded()
		return { newPage, newContext, newHomePage, newEditor, newShareMenu, errorPage }
	})
}

export function getStorageStateFileName(index: number, user: UserName) {
	return path.join(__dirname, `../.auth/${user}${index + 1}.json`)
}

export function areUrlsEqual(
	url1: string,
	url2: string,
	opts: { ignoreSearch?: boolean } = { ignoreSearch: true }
) {
	if (opts.ignoreSearch) {
		const url1Obj = new URL(url1)
		const url2Obj = new URL(url2)
		return url1Obj.origin === url2Obj.origin && url1Obj.pathname === url2Obj.pathname
	}
	return url1 === url2
}

export function createFixtures(page: Page) {
	const newSidebar = new Sidebar(page)
	const newEditor = new Editor(page, newSidebar)
	const newHomePage = new HomePage(page, newEditor)
	const newShareMenu = new ShareMenu(page)
	const errorPage = new ErrorPage(page)
	return { newSidebar, newEditor, newHomePage, newShareMenu, errorPage }
}

export function getRandomName() {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
	let result = ''
	for (let i = 0; i < 10; i++) {
		const randomIndex = Math.floor(Math.random() * characters.length)
		result += characters[randomIndex]
	}
	return result
}

const PROPAGATE_CHANGES_TIMEOUT = 100
/**
 * Ensures that the provided expectations are met both before and after a page reload.
 *
 * @param fn - An asynchronous function containing the expectations to be tested.
 * @param page - The Playwright Page object representing the browser page.
 *
 * The function performs the following steps:
 * 1. Executes the provided expectations and ensures they pass.
 * 2. Waits for a specified timeout to allow optimistic changes to propagate to the server.
 * 3. Reloads the page.
 * 4. Executes the provided expectations again and ensures they pass.
 */
export async function expectBeforeAndAfterReload(fn: () => Promise<void>, page: Page) {
	await fn()
	await sleep(PROPAGATE_CHANGES_TIMEOUT)
	await page.reload()
	const { newHomePage } = createFixtures(page)
	await newHomePage.isLoaded()
	await fn()
}
