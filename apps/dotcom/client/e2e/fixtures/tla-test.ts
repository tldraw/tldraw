import { clerkSetup } from '@clerk/testing/playwright'
import { test as base, expect } from '@playwright/test'
import fs from 'fs'
import { OTHER_USERS, USERS } from '../consts'
import { Database } from './Database'
import { Editor } from './Editor'
import { HomePage } from './HomePage'
import { ShareMenu } from './ShareMenu'
import { Sidebar } from './Sidebar'
import { getStorageStateFileName } from './helpers'

interface TlaFixtures {
	homePage: HomePage
	editor: Editor
	sidebar: Sidebar
	shareMenu: ShareMenu
	database: Database
	setupAndCleanup: void
}

interface TlaWorkerFixtures {
	workerStorageState: string
}

export const test = base.extend<TlaFixtures, TlaWorkerFixtures>({
	sidebar: async ({ page }, testUse) => {
		await testUse(new Sidebar(page))
	},
	editor: async ({ page, sidebar }, testUse) => {
		await testUse(new Editor(page, sidebar))
	},
	homePage: async ({ page, editor }, testUse) => {
		await testUse(new HomePage(page, editor))
	},
	database: async ({ page }, testUse) => {
		await testUse(new Database(page, test.info().parallelIndex))
	},
	shareMenu: async ({ page }, testUse) => {
		await testUse(new ShareMenu(page))
	},
	setupAndCleanup: [
		async ({ page, homePage, database }, testUse) => {
			// Make sure we don't get marked as a bot
			// https://clerk.com/docs/testing/playwright/overview
			// save the user info
			await clerkSetup()

			await homePage.goto()
			await homePage.isLoaded()

			await testUse()
			await page.close()
			await database.reset()
		},
		{ auto: true },
	],
	storageState: ({ workerStorageState }, testUse) => testUse(workerStorageState),
	workerStorageState: [
		async ({ browser }, testUse) => {
			const id = test.info().parallelIndex

			const fileName = getStorageStateFileName(id, 'huppy')
			if (fs.existsSync(fileName)) {
				// Reuse existing authentication state if any.
				await testUse(fileName)
				return
			}
			for (const user of ['huppy' as const, 'suppy' as const]) {
				const fileName = getStorageStateFileName(id, user)
				// Important: make sure we authenticate in a clean environment by unsetting storage state.
				const page = await browser.newPage({ storageState: undefined })
				let email: string
				if (user === 'huppy') {
					email = USERS[id]
				} else {
					email = OTHER_USERS[id]
				}
				await page.goto('http://localhost:3000/q')
				await page.click('text=Sign up')
				await page.getByLabel('Email address').fill(email)
				await page.getByRole('button', { name: 'Continue', exact: true }).click()
				await page.waitForTimeout(1000)
				await page.getByLabel('Enter verification code. Digit').fill('424242')
				await expect(page.getByTestId('tla-sidebar-layout')).toBeVisible()

				await page.context().storageState({ path: fileName })
				await page.close()
			}
			await testUse(fileName)
		},
		{ scope: 'worker' },
	],
})

export { expect } from '@playwright/test'
