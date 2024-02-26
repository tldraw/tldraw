import { test as base } from '@playwright/test'
import { ActionsMenu } from './menus/ActionsMenu'
import { HelpMenu } from './menus/HelpMenu'
import { StylePanel } from './menus/StylePanel'
import { Toolbar } from './menus/Toolbar'

type Fixtures = {
	toolbar: Toolbar
	stylePanel: StylePanel
	actionsMenu: ActionsMenu
	helpMenu: HelpMenu
}

const test = base.extend<Fixtures>({
	toolbar: async ({ page }, use) => {
		const toolbar = new Toolbar(page)
		await use(toolbar)
	},
	stylePanel: async ({ page }, use) => {
		const stylePanel = new StylePanel(page)
		await use(stylePanel)
	},
	actionsMenu: async ({ page }, use) => {
		const actionsMenu = new ActionsMenu(page)
		await use(actionsMenu)
	},
	helpMenu: async ({ page }, use) => {
		const helpMenu = new HelpMenu(page)
		await use(helpMenu)
	},
})

export default test
