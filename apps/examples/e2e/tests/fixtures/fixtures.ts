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
	toolbar: async ({ page }, testUse) => {
		const toolbar = new Toolbar(page)
		await testUse(toolbar)
	},
	stylePanel: async ({ page }, testUse) => {
		const stylePanel = new StylePanel(page)
		await testUse(stylePanel)
	},
	actionsMenu: async ({ page }, testUse) => {
		const actionsMenu = new ActionsMenu(page)
		await testUse(actionsMenu)
	},
	helpMenu: async ({ page }, testUse) => {
		const helpMenu = new HelpMenu(page)
		await testUse(helpMenu)
	},
	mainMenu: async ({ page }, testUse) => {
		const mainMenu = new MainMenu(page)
		await testUse(mainMenu)
	},
	pageMenu: async ({ page }, testUse) => {
		const pagemenu = new PageMenu(page)
		await testUse(pagemenu)
	},
	navigationPanel: async ({ page }, testUse) => {
		const navigationPanel = new NavigationPanel(page)
		await testUse(navigationPanel)
	},
	api: async ({ page }, testUse) => {
		const api = makeApiFixture(
			{
				exportAsSvg: true,
				exportAsFormat: true,
				createShapeId: true,
			},
			page
		)
		await testUse(api)
	},
})

export default test
