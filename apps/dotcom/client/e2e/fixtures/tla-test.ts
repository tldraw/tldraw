import { test as base } from '@playwright/test'
import { Editor } from './Editor'
import { HomePage } from './HomePage'
import { Sidebar } from './Sidebar'
import { Store } from './Store'

interface TlaFixtures {
	homePage: HomePage
	editor: Editor
	sidebar: Sidebar
	store: Store
}

export const test = base.extend<TlaFixtures>({
	sidebar: async ({ page }, testUse) => {
		testUse(new Sidebar(page))
	},
	editor: async ({ page, sidebar }, testUse) => {
		testUse(new Editor(page, sidebar))
	},
	homePage: async ({ page, sidebar, editor }, testUse) => {
		testUse(new HomePage(page, sidebar, editor))
	},
	store: async ({ page: _page }, testUse) => {
		testUse(new Store())
	},
})
export { expect } from '@playwright/test'
