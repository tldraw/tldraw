import { test as base } from '@playwright/test'
import { HomePage } from './HomePage'

interface TlaFixtures {
	homePage: HomePage
}

export const test = base.extend<TlaFixtures>({
	homePage: async ({ page }, use) => {
		use(new HomePage(page))
	},
})
export { expect } from '@playwright/test'

export function isMobile(browserName: string) {
	console.log(browserName)
	return browserName !== 'chromium'
}
