import { Browser, BrowserContext, Page, test } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { Editor } from './Editor'
import { ErrorPage } from './ErrorPages'
import { GroupInviteDialog } from './GroupInviteDialog'
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
		const { newSidebar, newEditor, newHomePage, newShareMenu, newGroupInviteDialog, errorPage } =
			createFixtures(newPage)
		if (url) {
			await newPage.goto(url)
		} else {
			await newHomePage.goto()
		}

		try {
			const readyState = await waitForIncognitoReadyState(newPage)
			if (readyState === 'editor') {
				await newHomePage.isLoaded()
			}
		} catch (error) {
			const diagnostics = await getIncognitoDiagnostics(newPage)
			throw new Error(
				`Incognito page failed to reach a known ready state (url=${diagnostics.url}, editor=${diagnostics.editorVisible}, canvas=${diagnostics.canvasVisible}, signIn=${diagnostics.signInVisible}, error=${diagnostics.errorVisible}, terms=${diagnostics.termsVisible}): ${
					error instanceof Error ? error.message : String(error)
				}`
			)
		}
		return {
			newPage,
			newContext,
			newSidebar,
			newHomePage,
			newEditor,
			newShareMenu,
			newGroupInviteDialog,
			errorPage,
		}
	})
}

type IncognitoReadyState = 'editor' | 'sign-in' | 'error'

async function waitForIncognitoReadyState(page: Page): Promise<IncognitoReadyState> {
	const editor = page.getByTestId('tla-editor')
	const signIn = page.getByTestId('tla-sign-in-button')
	const errorIcon = page.getByTestId('tla-error-icon')
	const termsButton = page.getByTestId('tla-accept-and-continue-button')
	const canvas = page.getByTestId('canvas')

	for (let attempt = 0; attempt < 20; attempt++) {
		if (await termsButton.isVisible().catch(() => false)) {
			await termsButton.click().catch(() => {})
		}
		if (await editor.isVisible().catch(() => false)) {
			if (await canvas.isVisible().catch(() => false)) return 'editor'
		}
		if (await signIn.isVisible().catch(() => false)) return 'sign-in'
		if (await errorIcon.isVisible().catch(() => false)) return 'error'
		await page.waitForTimeout(500)
	}

	throw new Error('timed out waiting for editor/sign-in/error state')
}

async function getIncognitoDiagnostics(page: Page) {
	return {
		url: page.url(),
		editorVisible: await page.getByTestId('tla-editor').isVisible().catch(() => false),
		canvasVisible: await page.getByTestId('canvas').isVisible().catch(() => false),
		signInVisible: await page.getByTestId('tla-sign-in-button').isVisible().catch(() => false),
		errorVisible: await page.getByTestId('tla-error-icon').isVisible().catch(() => false),
		termsVisible: await page
			.getByTestId('tla-accept-and-continue-button')
			.isVisible()
			.catch(() => false),
	}
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
	const newGroupInviteDialog = new GroupInviteDialog(page)
	const errorPage = new ErrorPage(page)
	return { newSidebar, newEditor, newHomePage, newShareMenu, newGroupInviteDialog, errorPage }
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
