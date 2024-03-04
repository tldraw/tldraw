import { test as base } from '@playwright/test'
import { ActionsMenu } from './menus/ActionsMenu'
import { HelpMenu } from './menus/HelpMenu'
import { MainMenu } from './menus/MainMenu'
import { NavigationPanel } from './menus/NavigationPanel'
import { PageMenu } from './menus/PageMenu'
import { StylePanel } from './menus/StylePanel'
import { Toolbar } from './menus/Toolbar'

type Fixtures = {
	toolbar: Toolbar
	stylePanel: StylePanel
	actionsMenu: ActionsMenu
	helpMenu: HelpMenu
	mainMenu: MainMenu
	pageMenu: PageMenu
	navigationPanel: NavigationPanel
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
	mainMenu: async ({ page }, use) => {
		const mainMenu = new MainMenu(page)
		await use(mainMenu)
	},
	pageMenu: async ({ page }, use) => {
		const pagemenu = new PageMenu(page)
		await use(pagemenu)
	},
	navigationPanel: async ({ page }, use) => {
		const navigationPanel = new NavigationPanel(page)
		await use(navigationPanel)
	},
})

export default test
