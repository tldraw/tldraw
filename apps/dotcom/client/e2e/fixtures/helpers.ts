import { Browser, BrowserContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { Editor } from './Editor'
import { ErrorPage } from './ErrorPages'
import { HomePage } from './HomePage'
import { ShareMenu } from './ShareMenu'
import { Sidebar } from './Sidebar'

export type UserName = 'huppy' | 'suppy'
type UserProps = { user: UserName; index: number } | undefined

export async function openNewIncognitoPage(
	browser: Browser,
	opts: { url?: string; userProps: UserProps; allowClipboard?: boolean }
) {
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
	const newSidebar = new Sidebar(newPage)
	const newEditor = new Editor(newPage, newSidebar)
	const newHomePage = new HomePage(newPage, newEditor)
	const newShareMenu = new ShareMenu(newPage)
	const errorPage = new ErrorPage(newPage)
	if (url) {
		await newPage.goto(url)
	} else {
		await newHomePage.goto()
	}

	await newHomePage.isLoaded()
	return { newPage, newContext, newHomePage, newEditor, newShareMenu, errorPage }
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
