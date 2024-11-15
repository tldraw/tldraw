import { clerkSetup } from '@clerk/testing/playwright'
import { expect, test as setup } from '@playwright/test'

setup('clerk setup and wait for page load', async ({ page }) => {
	await clerkSetup()
	await page.goto('http://localhost:3000/q')

	await expect(page.getByTestId('tla-signin-button')).toBeVisible()
	await expect(page.getByTestId('tla-editor')).toBeVisible()
})
