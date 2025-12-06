import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: './e2e',
	// Run files in parallel, but tests within a file in sequence. This is important for certain
	// tests that use shared system resources like the clipboard, which should all be kept in the
	// same file.
	fullyParallel: process.env.STAGING_TESTS ? true : false,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	// For now we need to use 1 worker for dev as well, otherwise clearing the db fails since there might
	// an open connection to the db when we are trying to clear it.
	workers: process.env.STAGING_TESTS ? 6 : process.env.CI ? 2 : 3,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	timeout: 30 * 1000,
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		// baseURL: 'http://127.0.0.1:3000',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
		video: 'retain-on-failure',
		launchOptions: {
			// Uncomment this to make the browser slow down. Useful when debugging in the headed mode.
			// slowMo: 1000,
		},
	},

	/* Configure projects for major browsers */
	projects: [
		{ name: 'global-setup', testMatch: /global\.setup\.ts/ },
		{ name: 'global-staging-setup', testMatch: /global-staging\.setup\.ts/ },
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
			},
			dependencies: ['global-setup'],
		},
		// {
		// 	name: 'firefox',
		// 	use: { ...devices['Desktop Firefox'] },
		{
			name: 'staging',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'e2e/.auth/staging.json',
			},
			testMatch: /staging\.spec\.ts/,
			dependencies: ['global-staging-setup'],
		},
		// },
		// {
		// 	name: 'webkit',
		// 	use: { ...devices['Desktop Safari'] },
		// },
		//
		/* Test against mobile viewports. */
		// {
		// 	name: 'Mobile Chrome',
		// 	use: {
		// 		...devices['Pixel 5'],
		// 	},
		// },
		// {
		//   name: 'Mobile Safari',
		//   use: { ...devices['iPhone 12'] },
		// },

		/* Test against branded browsers. */
		// {
		//   name: 'Microsoft Edge',
		//   use: { ...devices['Desktop Edge'], channel: 'msedge' },
		// },
		// {
		//   name: 'Google Chrome',
		//   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
		// },
	],

	/* Run your local dev server before starting the tests */
	webServer: {
		command: 'yarn dev-app',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
		cwd: path.join(__dirname, '../../../'),
		// remove comment if you wish to see the output of the server
		// stdout: 'pipe',
		// stderr: 'pipe',
	},
})
