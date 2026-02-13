import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

// delete the e2e/auth directory

// eslint-disable-next-line no-empty-pattern
setup('clerk setup', async ({}) => {
	await clerkSetup()
})
