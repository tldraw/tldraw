import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test as base } from '@playwright/test'
import { Editor } from './Editor'
import { HomePage } from './HomePage'
import { Sidebar } from './Sidebar'

interface StagingFixtures {
	editor: Editor
	sidebar: Sidebar
	homePage: HomePage
	setupAndCleanup: void
}

const STAGING_URL = 'https://staging.tldraw.com/'

export const test = base.extend<StagingFixtures>({
	sidebar: async ({ page }, testUse) => {
		await testUse(new Sidebar(page))
	},
	editor: async ({ page, sidebar }, testUse) => {
		await testUse(new Editor(page, sidebar))
	},
	homePage: async ({ page, editor }, testUse) => {
		await testUse(new HomePage(page, editor))
	},
	setupAndCleanup: [
		async ({ page, homePage }, testUse) => {
			await setupClerkTestingToken({ page })

			await homePage.goto(STAGING_URL)
			await homePage.isLoaded()

			await testUse()
		},
		{ auto: true },
	],
})

export { expect } from '@playwright/test'
