import path from 'path'
import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

const scenarioTestMatch = /.*\.scenario\.spec\.ts/
// Legacy smoke specs live in e2e/tests/smoke and are intentionally separate from the default
// scenario runner. See e2e/README.md.
const smokeTestMatch = /tests\/smoke\/.*\.spec\.ts/

// Fail fast if the dev stack does not come up: not a single test runs until http://localhost:3000
// responds, so a stuck server otherwise burns CI minutes. The dotcom server should boot well within
// this. If a CI cold start ever legitimately needs longer, raise this (and the readiness budgets in
// zero-cache/dev-env.ts) rather than reverting to a multi-minute stuck wait.
const CI_WEB_SERVER_TIMEOUT_MS = 180_000

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: './e2e',
	// CI keeps the host-native dev stack (`dev-app:host`: postgres-in-Docker + host workers/zero).
	// Locally the webServer starts the full Docker dev stack (`dev-app`). Tear it down in CI
	// afterwards so containers and ports do not leak between runs. No-op locally (reused server).
	globalTeardown: process.env.CI ? require.resolve('./e2e/global.teardown.ts') : undefined,
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
			testMatch: smokeTestMatch,
			use: {
				...devices['Desktop Chrome'],
			},
			dependencies: ['global-setup'],
		},
		{
			name: 'chromium-scenarios',
			testMatch: scenarioTestMatch,
			fullyParallel: true,
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
		command: process.env.CI ? 'VITE_PREVIEW=1 yarn dev-app:host' : 'yarn dev-app',
		url: 'http://localhost:3000',
		reuseExistingServer: !process.env.CI,
		cwd: path.join(__dirname, '../../../'),
		timeout: process.env.CI ? CI_WEB_SERVER_TIMEOUT_MS : 300_000,
	},
})
