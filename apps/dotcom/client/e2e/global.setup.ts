import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

// eslint-disable-next-line no-empty-pattern
setup('clerk setup', async ({}) => {
	await clerkSetup()
})
