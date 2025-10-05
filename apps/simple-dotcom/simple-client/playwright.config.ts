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
	// Enable parallel execution for faster test runs
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 2 : 4, // Use 4 workers locally, 2 in CI
	reporter: [['html', { open: 'never' }]],
	timeout: 30000,
	// Global setup runs before all tests to clean up any leftover data
	globalSetup: './e2e/global-setup.ts',
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
		// Record traces on first retry and keep them for debugging
		trace: 'on-first-retry',
		// Take screenshots on failure for debugging
		screenshot: 'only-on-failure',
		// Record video on retry to help diagnose flaky tests
		video: 'retain-on-failure',
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
