import { FullConfig } from '@playwright/test'
import { App } from '@tldraw/editor'

async function globalSetup(config: FullConfig) {
	// noop
	return config
}

export default globalSetup

declare const app: App
