import { test as base } from '@playwright/test'
import { Editor } from './Editor'
import { HomePage } from './HomePage'
import { Sidebar } from './Sidebar'

interface TlaFixtures {
	homePage: HomePage
	editor: Editor
	sidebar: Sidebar
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
})
export { expect } from '@playwright/test'
