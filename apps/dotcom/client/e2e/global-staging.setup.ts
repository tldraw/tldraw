import { clerkSetup } from '@clerk/testing/playwright'
import { chromium, expect, test as setup } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { Editor } from './fixtures/Editor'
import { HomePage } from './fixtures/HomePage'
import { Sidebar } from './fixtures/Sidebar'

// eslint-disable-next-line no-empty-pattern
setup('clerk setup', async ({}) => {
	await clerkSetup()
})

setup('global staging setup', async () => {
	const stagingStoragePath = path.join(__dirname, '.auth/staging.json')

	if (fs.existsSync(stagingStoragePath)) {
		console.warn('Staging auth already exists, skipping setup')
		return
	}

	const email = process.env.STAGING_TEST_EMAIL
	const password = process.env.STAGING_TEST_PASSWORD

	if (!email || !password) {
		throw new Error(
			'STAGING_TEST_EMAIL and STAGING_TEST_PASSWORD not set, skipping staging auth setup'
		)
	}

	const browser = await chromium.launch()
	const page = await browser.newPage()

	const sidebar = new Sidebar(page)
	const editor = new Editor(page, sidebar)
	const homePage = new HomePage(page, editor)

	await homePage.goto('https://staging.tldraw.com/')
	await homePage.loginWithEmailAndPassword(email, password)
	await expect(page.getByTestId('tla-sidebar-layout')).toBeVisible()

	const authDir = path.dirname(stagingStoragePath)
	if (!fs.existsSync(authDir)) {
		fs.mkdirSync(authDir, { recursive: true })
	}

	await page.context().storageState({ path: stagingStoragePath })
	await browser.close()
})
