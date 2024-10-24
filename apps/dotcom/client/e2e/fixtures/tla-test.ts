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
	homePage: async ({ page }, testUse) => {
		testUse(new HomePage(page))
	},
	editor: async ({ page }, testUse) => {
		testUse(new Editor(page))
	},
	sidebar: async ({ page }, testUse) => {
		testUse(new Sidebar(page))
	},
})
export { expect } from '@playwright/test'
