import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local for test environment variables
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: './e2e',
	// Serial execution for dev server - Next.js dev compilation is slow with concurrent requests
	// For faster parallel execution, use production build: `next build && next start`
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1, // Use 1 worker with dev server, can increase to 3-5 with production build
	reporter: undefined,
	timeout: 20000,
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
		trace: 'on-first-retry',
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	webServer: {
		command: 'yarn workspace simple-client dev',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
		cwd: '../../../', // Run from repo root to access workspace command
	},
})
