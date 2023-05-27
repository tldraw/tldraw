import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
	// noop
	return config
}

export default globalTeardown
