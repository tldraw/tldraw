import path from 'path'
import { USER_1 } from './consts'
import { test as setup } from './fixtures/tla-test'

const authFile = path.join(__dirname, '../e2e/.auth/user.json')

setup('authenticate', async ({ page, homePage }) => {
	await homePage.loginAs(USER_1)

	await page.context().storageState({ path: authFile })
})
