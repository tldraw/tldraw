import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test as base, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { Editor } from './Editor'
import { HomePage } from './HomePage'
import { Sidebar } from './Sidebar'

interface StagingFixtures {
	editor: Editor
	sidebar: Sidebar
	homePage: HomePage
	setupAndCleanup: void
}

interface StagingWorkerFixtures {
	workerStorageState: string
}

function getStagingStorageStateFileName() {
	return path.join(__dirname, '../.auth/staging.json')
}

const STAGING_URL = 'https://staging.tldraw.com/'

export const test = base.extend<StagingFixtures, StagingWorkerFixtures>({
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
	storageState: ({ workerStorageState }, testUse) => testUse(workerStorageState),
	workerStorageState: [
		async ({ browser }, testUse) => {
			const fileName = getStagingStorageStateFileName()
			if (fs.existsSync(fileName)) {
				// Reuse existing authentication state if any.
				await testUse(fileName)
				return
			}

			const email = process.env.STAGING_TEST_EMAIL
			const password = process.env.STAGING_TEST_PASSWORD

			if (!email || !password) {
				throw new Error(
					'STAGING_TEST_EMAIL and STAGING_TEST_PASSWORD environment variables must be set'
				)
			}

			const page = await browser.newPage({ storageState: undefined })

			const sidebar = new Sidebar(page)
			const editor = new Editor(page, sidebar)
			const homePage = new HomePage(page, editor)

			await homePage.goto(STAGING_URL)
			await homePage.loginWithEmailAndPassword(email, password)
			await expect(page.getByTestId('tla-sidebar-layout')).toBeVisible()

			await page.context().storageState({ path: fileName })
			await page.close()

			await testUse(fileName)
		},
		{ scope: 'worker' },
	],
})

export { expect } from '@playwright/test'
