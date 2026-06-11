/**
 * Press the platform "accelerator" chord plus a letter key, mirroring tldraw's
 * `isAccelKey` (Cmd on Apple platforms, Ctrl elsewhere).
 *
 * Why not WebdriverIO's `browser.keys()`: on iOS Safari it never reaches web
 * content at all — zero keydowns arrive at the page, even plain letters into a
 * focused visible input (established empirically in tldraw/tldraw#9101). The
 * only working keyboard path on iOS is Appium XCUITest's `mobile: keys`, which
 * injects through the OS hardware-keyboard pipeline. We use the Android
 * equivalent (`mobile: pressKey`, a hardware key event with a meta state) for
 * the same device-realism on Android.
 */
export async function pressAccel(key: string) {
	if (browser.isIOS) {
		// XCUITest modifierFlags bitmask: Shift = 1 << 1, Ctrl = 1 << 2, Cmd = 1 << 4.
		await browser.execute('mobile: keys', {
			keys: [{ key, modifierFlags: 1 << 4 }],
		})
	} else {
		// Android KeyEvent: KEYCODE_A = 29; META_CTRL_ON = 0x1000, META_CTRL_LEFT_ON = 0x2000.
		const keycode = 29 + (key.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0))
		await browser.execute('mobile: pressKey', {
			keycode,
			metastate: 0x1000 | 0x2000,
		})
	}
}
