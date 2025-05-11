import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'
import fs from 'fs/promises'

// delete the e2e/auth directory

// eslint-disable-next-line no-empty-pattern
setup('clerk setup', async ({}) => {
	await fs.rm('./.auth', { recursive: true, force: true })
	await clerkSetup()
})
