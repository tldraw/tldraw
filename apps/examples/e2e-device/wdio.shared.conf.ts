import type { Options } from '@wdio/types'

const PORT = process.env.EXAMPLES_PORT ?? '5420'

/**
 * Base WebdriverIO config shared by the iOS and Android device suites. The
 * per-platform configs spread this and add their own `capabilities`.
 *
 * Appium is started for us by `@wdio/appium-service`; the relevant driver
 * (xcuitest / uiautomator2) is installed by the CI job before this runs.
 */
export const shared: Options.Testrunner = {
	runner: 'local',
	// Run the built examples app. iOS sim shares the host's localhost; the
	// Android job forwards the port into the emulator with `adb reverse`.
	baseUrl: `http://localhost:${PORT}`,

	specs: ['./tests/**/*.e2e.ts'],
	maxInstances: 1,

	logLevel: 'warn',
	waitforTimeout: 10_000,
	// Generous per-request timeout: the first session creation has to build and
	// launch WebDriverAgent on a cold simulator, which can take several minutes.
	connectionRetryTimeout: 600_000,
	// Do NOT retry session creation: each retry boots another simulator, and
	// several simulators booting at once on a small CI runner causes them all to
	// time out. One attempt with a long timeout; the spec-level retry handles
	// genuine flakes.
	connectionRetryCount: 1,

	framework: 'mocha',
	mochaOpts: {
		ui: 'bdd',
		timeout: 90_000,
		// Gestures are inherently a little flaky; let an individual test retry
		// before failing the run. Re-running the whole job is always an option too.
		retries: 1,
	},
	// Retry an entire spec file once if it fails outright (e.g. a flaky sim boot).
	specFileRetries: 1,
	specFileRetriesDeferred: true,

	reporters: ['spec'],

	services: [
		[
			'appium',
			{
				args: { relaxedSecurity: true },
				// Appium is installed globally in CI; use that binary.
				command: 'appium',
			},
		],
	],
}
