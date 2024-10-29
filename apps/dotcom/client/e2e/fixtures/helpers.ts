import { Browser } from '@playwright/test'
import { Editor } from './Editor'
import { ErrorPage } from './ErrorPages'
import { HomePage } from './HomePage'
import { Sidebar } from './Sidebar'

export async function openNewIncognitoPage(browser: Browser, url?: string) {
	const newContext = await browser.newContext({ storageState: undefined })
	const newPage = await newContext.newPage()
	if (url) await newPage.goto(url)
	const newSidebar = new Sidebar(newPage)
	const newEditor = new Editor(newPage, newSidebar)
	const newHomePage = new HomePage(newPage, newSidebar, newEditor)
	const errorPage = new ErrorPage(newPage)
	return { newPage, newContext, newHomePage, newEditor, errorPage }
}
