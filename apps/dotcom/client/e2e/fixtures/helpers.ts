import { Browser } from '@playwright/test'
import { Editor } from './Editor'
import { ErrorPage } from './ErrorPages'
import { HomePage } from './HomePage'
import { Sidebar } from './Sidebar'

export async function openNewIncognitoPage(
	browser: Browser,
	editor: Editor,
	sidebar: Sidebar,
	url?: string
) {
	const newContext = await browser.newContext({ storageState: undefined })
	const newPage = await newContext.newPage()
	if (url) await newPage.goto(url)
	const newHomePage = new HomePage(newPage, sidebar, editor)
	const errorPage = new ErrorPage(newPage)
	const newEditor = new Editor(newPage, sidebar)
	return { newPage, newContext, newHomePage, newEditor, errorPage }
}
