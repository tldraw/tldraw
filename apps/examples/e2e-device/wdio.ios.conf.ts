import type { Options } from '@wdio/types'
import { shared } from './wdio.shared.conf'

const deviceName = process.env.APPIUM_DEVICE_NAME ?? 'iPhone 16'

/**
 * Drives real Mobile Safari in the iOS Simulator via Appium's XCUITest driver.
 * Touch gestures are performed in the NATIVE context (see helpers/pinch.ts),
 * which is the only place multi-touch W3C actions work on iOS — they go through
 * the real Simulator touch system and therefore through Safari's own gesture
 * recognizer.
 */
export const config: Options.Testrunner = {
	...shared,
	capabilities: [
		{
			platformName: 'iOS',
			'appium:automationName': 'XCUITest',
			'appium:deviceName': deviceName,
			// Pin platformVersion in CI to the runtime shipped by the macos-26 image
			// if you need determinism; left unset here to use the booted default.
			browserName: 'Safari',
			'appium:safariInitialUrl': `${shared.baseUrl}/end-to-end`,
			'appium:newCommandTimeout': 120,
			// Reuse the already-booted simulator from the CI step.
			'appium:noReset': true,
		},
	],
}
