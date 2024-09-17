import { FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
	return config
}

export default globalSetup
