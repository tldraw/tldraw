import path from 'path'
import { test as setup } from './fixtures/tla-test'

const authFile = path.join(__dirname, '../e2e/.auth/user.json')

setup('authenticate', async ({ page, homePage }) => {
	await homePage.login()

	await page.context().storageState({ path: authFile })
})
