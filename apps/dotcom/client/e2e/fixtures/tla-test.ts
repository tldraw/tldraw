import { test as base } from '@playwright/test'
import { Database } from './Database'
import { DeleteFileDialog } from './DeleteFileDialog'
import { Editor } from './Editor'
import { HomePage } from './HomePage'
import { ShareMenu } from './ShareMenu'
import { Sidebar } from './Sidebar'

interface TlaFixtures {
	homePage: HomePage
	editor: Editor
	sidebar: Sidebar
	deleteFileDialog: DeleteFileDialog
	shareMenu: ShareMenu
	database: Database
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
	deleteFileDialog: async ({ page }, testUse) => {
		testUse(new DeleteFileDialog(page))
	},
})
export { expect } from '@playwright/test'
