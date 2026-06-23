import type { Options } from '@wdio/types'
import { shared } from './wdio.shared.conf'

/**
 * Drives real Chrome on the Android emulator via Appium's UiAutomator2 driver.
 * Multi-touch pinch is injected as real MotionEvents in the NATIVE context
 * (see helpers/pinch.ts) rather than through bare chromedriver, whose multi-touch
 * support is unreliable.
 */
export const config: Options.Testrunner = {
	...shared,
	capabilities: [
		{
			platformName: 'Android',
			'appium:automationName': 'UiAutomator2',
			browserName: 'Chrome',
			'appium:newCommandTimeout': 120,
			// Let Appium manage a matching chromedriver for the emulator's Chrome.
			'appium:chromedriverAutodownload': true,
		},
	],
}
