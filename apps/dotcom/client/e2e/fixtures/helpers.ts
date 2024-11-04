import { Browser } from '@playwright/test'
import { Editor } from './Editor'
import { ErrorPage } from './ErrorPages'
import { HomePage } from './HomePage'
import { ShareMenu } from './ShareMenu'
import { Sidebar } from './Sidebar'

export async function openNewIncognitoPage(
	browser: Browser,
	opts: { url?: string; asUser?: string; allowClipboard?: boolean }
) {
	const { url, asUser, allowClipboard } = opts
	const newContext = await browser.newContext({ storageState: undefined })
	if (allowClipboard) {
		await newContext.grantPermissions(['clipboard-read', 'clipboard-write'])
	}
	const newPage = await newContext.newPage()
	const newSidebar = new Sidebar(newPage)
	const newEditor = new Editor(newPage, newSidebar)
	const newHomePage = new HomePage(newPage, newEditor)
	const newShareMenu = new ShareMenu(newPage)
	const errorPage = new ErrorPage(newPage)
	if (asUser) await newHomePage.loginAs(asUser)
	if (url) {
		await newPage.goto(url)
	} else {
		await newHomePage.goto()
	}

	await newHomePage.isLoaded()
	return { newPage, newContext, newHomePage, newEditor, newShareMenu, errorPage }
}
