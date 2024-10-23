import { test as base } from '@playwright/test'
import { HomePage } from './HomePage'

interface TlaFixtures {
	homePage: HomePage
}

export const test = base.extend<TlaFixtures>({
	homePage: async ({ page }, testUse) => {
		testUse(new HomePage(page))
	},
})
export { expect } from '@playwright/test'
