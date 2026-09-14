import { atom } from '@tldraw/state'
import { LicenseManager } from './LicenseManager'

/**
 * Options for {@link setLicense}.
 *
 * @public
 */
export interface TLSetLicenseOptions {
	/** A license key issued by tldraw. */
	licenseKey: string
}

const imperativeLicenseKey = atom<string | null>('imperativeLicenseKey', null)

/**
 * Set the tldraw license for the page without passing a key through the React tree.
 *
 * Use this when the code that needs a license doesn't render: a tool, a store write, or an editor
 * created directly with `new Editor()`. It's the imperative counterpart of the `licenseKey` prop,
 * not a replacement — a key passed to `<Tldraw />`, `<TldrawEditor />` or `new Editor()` wins over
 * the one set here, so two editors on a page can hold different licenses.
 *
 * The key applies to editors that already exist, so it doesn't matter whether this runs before or
 * after the editor mounts. Calling it again replaces the key.
 *
 * @example
 * ```ts
 * setLicense({ licenseKey: 'tldraw-...' })
 * ```
 *
 * @public
 */
export function setLicense({ licenseKey }: TLSetLicenseOptions): void {
	imperativeLicenseKey.set(licenseKey)
}

/**
 * The license key to use when none was passed explicitly: the one given to {@link setLicense}, or
 * failing that the one in the environment. Reactive — reading it inside a signal recomputes when
 * {@link setLicense} is called.
 *
 * @internal
 */
export function getDefaultLicenseKey(): string | undefined {
	return imperativeLicenseKey.get() ?? getLicenseKeyFromEnv() ?? undefined
}

const licenseManagersByKey = new Map<string, LicenseManager>()

/**
 * The license manager for a key, shared across everything that resolves to that key — one key means
 * one manager. Validation runs crypto and fires a tracking request, so a page with several editors
 * (or a test file with several hundred) must not repeat it per editor, and an editor must not end
 * up on a different manager from the React tree above it.
 *
 * @internal
 */
export function getSharedLicenseManager(licenseKey: string | undefined): LicenseManager {
	// A missing key is its own entry rather than a skipped lookup: an unlicensed editor still has a
	// manager, and it should be the same one for every unlicensed editor.
	const cacheKey = licenseKey ?? ''
	let licenseManager = licenseManagersByKey.get(cacheKey)
	if (!licenseManager) {
		licenseManager = new LicenseManager(licenseKey)
		licenseManagersByKey.set(cacheKey, licenseManager)
	}
	return licenseManager
}

/**
 * Drop a shared manager and silence its pending validation, for a key the page has moved off. The
 * cache must let go of it too, or a later editor on that key would be handed a dead manager whose
 * state never resolves.
 *
 * @internal
 */
export function disposeSharedLicenseManager(licenseManager: LicenseManager): void {
	for (const [cacheKey, cached] of licenseManagersByKey) {
		if (cached === licenseManager) licenseManagersByKey.delete(cacheKey)
	}
	licenseManager.dispose()
}

/** @internal */
export function resetLicenseForTest(): void {
	imperativeLicenseKey.set(null)
	// Dropping a manager without disposing it leaves its pending validation free to log and track.
	for (const licenseManager of licenseManagersByKey.values()) licenseManager.dispose()
	licenseManagersByKey.clear()
}

let envLicenseKey: string | undefined | null = undefined
function getLicenseKeyFromEnv() {
	if (envLicenseKey !== undefined) {
		return envLicenseKey
	}
	// it's important here that we write out the full process.env.WHATEVER expression instead of
	// doing something like process.env[someVariable]. This is because most bundlers do something
	// like a find-replace inject environment variables, and so won't pick up on dynamic ones. It
	// also means we can't do checks like `process.env && process.env.WHATEVER`, which is why we use
	// the `getEnv` try/catch approach.

	// framework-specific prefixes borrowed from the ones vercel uses, but trimmed down to just the
	// react-y ones: https://vercel.com/docs/environment-variables/framework-environment-variables
	envLicenseKey =
		getEnv(() => process.env.TLDRAW_LICENSE_KEY) ||
		getEnv(() => process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY) ||
		getEnv(() => process.env.REACT_APP_TLDRAW_LICENSE_KEY) ||
		getEnv(() => process.env.GATSBY_TLDRAW_LICENSE_KEY) ||
		getEnv(() => process.env.VITE_TLDRAW_LICENSE_KEY) ||
		getEnv(() => process.env.PUBLIC_TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.REACT_APP_TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.GATSBY_TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.VITE_TLDRAW_LICENSE_KEY) ||
		getEnv(() => (import.meta as any).env.PUBLIC_TLDRAW_LICENSE_KEY) ||
		null

	return envLicenseKey
}

function getEnv(cb: () => string | undefined) {
	try {
		return cb()
	} catch {
		return undefined
	}
}
