import { test as setup } from './fixtures/tla-test'

// Don't use stored credentials
setup.use({ storageState: { cookies: [], origins: [] } })

setup('make sure app has loaded', async ({ homePage }) => {
	await homePage.goto()
	await homePage.isLoaded()
	await homePage.expectSignInButtonVisible()
})
