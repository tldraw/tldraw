import { Browser } from '@playwright/test'
import { Editor } from './Editor'
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
	return { newPage, newContext, newHomePage }
}
