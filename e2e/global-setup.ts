import { FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
	// noop
	return config
}

export default globalSetup
