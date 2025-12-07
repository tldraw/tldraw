import type { PlaywrightTestConfig } from '@playwright/test'
import { devices } from '@playwright/test'
import { config as _config } from 'dotenv'
import path from 'path'
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
_config()

const __dirname = path.dirname(new URL(import.meta.url).pathname)

/**
 * Performance test configuration - uses production build for accurate metrics.
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
	globalSetup: './global-setup.ts',
	globalTeardown: './global-teardown.ts',
	/* Maximum time one test can run for. */
	timeout: 120 * 1000, // Longer timeout for perf tests
	expect: {
		/**
		 * Maximum time expect() should wait for the condition to be met.
		 * For example in `await expect(locator).toHaveText();`
		 */
		timeout: 5000,
		toHaveScreenshot: {
			maxDiffPixelRatio: 0.0001,
			threshold: 0.01,
		},
	},
	// Run tests in serial for consistent performance measurements
	fullyParallel: false,
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
		// baseURL: 'http://localhost:5421',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',
		headless: true,
		video: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},

	/* Environment variables for tests */
	// Set port for production build server
	...({ env: { PERF_TEST_PORT: '5421' } } as any),

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
			},
		},
	],

	/* Folder for test artifacts such as screenshots, videos, traces, etc. */
	outputDir: './test-results',

	/* Build and serve production version for accurate performance metrics */
	webServer: {
		command: 'cd apps/examples && yarn build && yarn preview --port 5421 --strictPort',
		port: 5421,
		reuseExistingServer: !process.env.CI,
		timeout: 180 * 1000, // 3 minutes for build
		cwd: path.join(__dirname, '../../..'),
	},
}

export default config
