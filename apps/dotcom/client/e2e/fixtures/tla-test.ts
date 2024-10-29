import { test as base } from '@playwright/test'
import { Database } from './Database'
import { Editor } from './Editor'
import { HomePage } from './HomePage'
import { ShareMenu } from './ShareMenu'
import { Sidebar } from './Sidebar'

interface TlaFixtures {
	homePage: HomePage
	editor: Editor
	sidebar: Sidebar
	database: Database
	shareMenu: ShareMenu
}

export const test = base.extend<TlaFixtures>({
	sidebar: async ({ page }, testUse) => {
		testUse(new Sidebar(page))
	},
	editor: async ({ page, sidebar }, testUse) => {
		testUse(new Editor(page, sidebar))
	},
	homePage: async ({ page, editor }, testUse) => {
		testUse(new HomePage(page, editor))
	},
	database: async ({ page }, testUse) => {
		testUse(new Database(page))
	},
	shareMenu: async ({ page }, testUse) => {
		testUse(new ShareMenu(page))
	},
})
export { expect } from '@playwright/test'
