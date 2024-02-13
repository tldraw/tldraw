import { test as base } from '@playwright/test'
import { Toolbar } from './toolbar'

const test = base.extend({
	toolbar: async ({ page }, use) => {
		const toolbar = new Toolbar(page)
		await use(toolbar)
	},
})

export default test
