import { Key } from 'webdriverio'

/**
 * Press the platform "accelerator" chord plus a key, mirroring tldraw's
 * `isAccelKey` (Cmd on Apple platforms, Ctrl elsewhere). Passing the keys as an
 * array makes WebdriverIO hold the modifier down for the chord and release both
 * at the end — i.e. a real Cmd+C, not "Cmd" then "C" typed separately.
 */
export async function pressAccel(key: string) {
	const accel = browser.isIOS ? Key.Command : Key.Ctrl
	await browser.keys([accel, key])
}
