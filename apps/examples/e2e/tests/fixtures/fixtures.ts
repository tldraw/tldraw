import { Page, test as base } from '@playwright/test'
import { EndToEndApi } from '../../../src/misc/EndToEndApi'
import { ActionsMenu } from './menus/ActionsMenu'
import { HelpMenu } from './menus/HelpMenu'
import { MainMenu } from './menus/MainMenu'
import { NavigationPanel } from './menus/NavigationPanel'
import { PageMenu } from './menus/PageMenu'
import { StylePanel } from './menus/StylePanel'
import { Toolbar } from './menus/Toolbar'

interface Fixtures {
	toolbar: Toolbar
	stylePanel: StylePanel
	actionsMenu: ActionsMenu
	helpMenu: HelpMenu
	mainMenu: MainMenu
	pageMenu: PageMenu
	navigationPanel: NavigationPanel
	api: ReturnType<typeof makeApiFixture>
}

export type ApiFixture = {
	[K in keyof EndToEndApi]: (
		...args: Parameters<EndToEndApi[K]>
	) => Promise<ReturnType<EndToEndApi[K]>>
}

function makeApiFixture(keys: { [K in keyof EndToEndApi]: true }, page: Page): ApiFixture {
	const result = {} as any

	for (const key of Object.keys(keys)) {
		result[key] = (...args: any[]) => {
			return page.evaluate(
				([key, ...args]) => {
					return (window as any).tldrawApi[key](...args)
				},
				[key, ...args]
			)
		}
	}

	return result
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
	api: async ({ page }, use) => {
		const api = makeApiFixture(
			{
				exportAsSvg: true,
				exportAsFormat: true,
			},
			page
		)
		await use(api)
	},
})

export default test
