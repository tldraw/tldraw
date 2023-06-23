import type { PlaywrightTestConfig } from '@playwright/test'
import { devices } from '@playwright/test'
import { config as _config } from 'dotenv'
import path from 'path'
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
_config()

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
	testDir: './tests',
	globalSetup: './global-setup.ts',
	globalTeardown: './global-teardown.ts',
	/* Maximum time one test can run for. */
	timeout: 30 * 1000,
	expect: {
		/**
		 * Maximum time expect() should wait for the condition to be met.
		 * For example in `await expect(locator).toHaveText();`
		 */
		timeout: 2000,
		toHaveScreenshot: {
			maxDiffPixelRatio: 0.001,
			threshold: 0.01,
		},
	},
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: false, // !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 1 : 0,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: process.env.CI ? [['list'], ['github'], ['html', { open: 'never' }]] : 'list',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
		actionTimeout: 0,
		/* Base URL to use in actions like `await page.goto('/')`. */
		// baseURL: 'http://localhost:5420',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
		headless: true, // !process.env.CI,
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
			},
		},

		// {
		// 	name: 'webkit',
		// 	use: {
		// 		...devices['Desktop Safari'],
		// 	},
		// },

		// /* Test against mobile viewports. */
		{
			name: 'Mobile Chrome',
			use: {
				...devices['Pixel 5'],
			},
		},
		// {
		// 	name: 'Mobile Safari',
		// 	use: {
		// 		...devices['iPhone 12'],
		// 	},
		// },

		/* Test against branded browsers. */
		// {
		//   name: 'Microsoft Edge',
		//   use: {
		//     channel: 'msedge',
		//   },
		// },
		// {
		//   name: 'Google Chrome',
		//   use: {
		//     channel: 'chrome',
		//   },
		// },
	],

	/* Folder for test artifacts such as screenshots, videos, traces, etc. */
	outputDir: './test-results',

	/* Run your local dev server before starting the tests */
	webServer: {
		command: 'yarn dev',
		port: 5420,
		reuseExistingServer: !process.env.CI,
		cwd: path.join(__dirname, '../../..'),
	},
}

export default config
