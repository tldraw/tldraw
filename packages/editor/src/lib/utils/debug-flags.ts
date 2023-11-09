import { Atom, atom, react } from '@tldraw/state'

// --- 1. DEFINE ---
//
// Define your debug values and feature flags here. Use `createDebugValue` to
// create an arbitrary value with defaults for production, staging, and
// development. Use `createFeatureFlag` to create a boolean flag which will be
// `true` by default in development and staging, and `false` in production.
/** @internal */
export const featureFlags: Record<string, DebugFlag<boolean>> = {
	// todo: remove this. it's not used, but we only have one feature flag and i
	// wanted an example :(
}

/** @internal */
export const debugFlags = {
	// --- DEBUG VALUES ---
	preventDefaultLogging: createDebugValue('preventDefaultLogging', {
		defaults: { all: false },
	}),
	pointerCaptureLogging: createDebugValue('pointerCaptureLogging', {
		defaults: { all: false },
	}),
	pointerCaptureTracking: createDebugValue('pointerCaptureTracking', {
		defaults: { all: false },
	}),
	pointerCaptureTrackingObject: createDebugValue(
		'pointerCaptureTrackingObject',
		// ideally we wouldn't store this mutable value in an atom but it's not
		// a big deal for debug values
		{
			defaults: { all: new Map<Element, number>() },
			shouldStoreForSession: false,
		}
	),
	elementRemovalLogging: createDebugValue('elementRemovalLogging', {
		defaults: { all: false },
	}),
	debugSvg: createDebugValue('debugSvg', {
		defaults: { all: false },
	}),
	throwToBlob: createDebugValue('throwToBlob', {
		defaults: { all: false },
	}),
	logMessages: createDebugValue('uiLog', { defaults: { all: [] as any[] } }),
	resetConnectionEveryPing: createDebugValue('resetConnectionEveryPing', {
		defaults: { all: false },
	}),
	debugCursors: createDebugValue('debugCursors', {
		defaults: { all: false },
	}),
	forceSrgb: createDebugValue('forceSrgbColors', { defaults: { all: false } }),
	debugGeometry: createDebugValue('debugGeometry', { defaults: { all: false } }),
	hideShapes: createDebugValue('hideShapes', { defaults: { all: false } }),
}

declare global {
	interface Window {
		tldrawLog: (message: any) => void
	}
}

if (typeof window !== 'undefined') {
	window.tldrawLog = (message: any) => {
		debugFlags.logMessages.set(debugFlags.logMessages.get().concat(message))
	}
}

// --- 2. USE ---
// In normal code, read from debug flags directly by calling .value on them:
//    if (debugFlags.preventDefaultLogging.value) { ... }
//
// In react, wrap your reads in `useValue` (or your component in `track`)
// so they react to changes:
//    const shouldLog = useValue(debugFlags.preventDefaultLogging)

// --- 3. GET FUNKY ---
// If you need to do fun stuff like monkey-patching in response to flag changes,
// add that here. Make sure you wrap your code in `react` so it runs
// automatically when values change!

if (typeof Element !== 'undefined') {
	const nativeElementRemoveChild = Element.prototype.removeChild
	react('element removal logging', () => {
		if (debugFlags.elementRemovalLogging.get()) {
			Element.prototype.removeChild = function <T extends Node>(this: any, child: Node): T {
				console.warn('[tldraw] removing child:', child)
				return nativeElementRemoveChild.call(this, child) as T
			}
		} else {
			Element.prototype.removeChild = nativeElementRemoveChild
		}
	})
}

// --- IMPLEMENTATION ---
// you probably don't need to read this if you're just using the debug values system
function createDebugValue<T>(
	name: string,
	{
		defaults,
		shouldStoreForSession = true,
	}: { defaults: Defaults<T>; shouldStoreForSession?: boolean }
) {
	return createDebugValueBase({
		name,
		defaults,
		shouldStoreForSession,
	})
}

// function createFeatureFlag(
// 	name: string,
// 	defaults: Defaults<boolean> = { all: true, production: false }
// ) {
// 	return createDebugValueBase({
// 		name,
// 		defaults,
// 		shouldStoreForSession: true,
// 	})
// }

function createDebugValueBase<T>(def: DebugFlagDef<T>): DebugFlag<T> {
	const defaultValue = getDefaultValue(def)
	const storedValue = def.shouldStoreForSession
		? (getStoredInitialValue(def.name) as T | null)
		: null
	const valueAtom = atom(`debug:${def.name}`, storedValue ?? defaultValue)

	if (typeof window !== 'undefined') {
		if (def.shouldStoreForSession) {
			react(`debug:${def.name}`, () => {
				const currentValue = valueAtom.get()
				try {
					if (currentValue === defaultValue) {
						window.sessionStorage.removeItem(`tldraw_debug:${def.name}`)
					} else {
						window.sessionStorage.setItem(`tldraw_debug:${def.name}`, JSON.stringify(currentValue))
					}
				} catch {
					// not a big deal
				}
			})
		}

		Object.defineProperty(window, `tldraw${def.name.replace(/^[a-z]/, (l) => l.toUpperCase())}`, {
			get() {
				return valueAtom.get()
			},
			set(newValue) {
				valueAtom.set(newValue)
			},
			configurable: true,
		})
	}

	return Object.assign(valueAtom, def)
}

function getStoredInitialValue(name: string) {
	try {
		return JSON.parse(window?.sessionStorage.getItem(`tldraw_debug:${name}`) ?? 'null')
	} catch (err) {
		return null
	}
}

// process.env might not be defined, but we can't access it using optional
// chaining because some bundlers search for `process.env.SOMETHING` as a string
// and replace it with its value.
function readEnv(fn: () => string | undefined) {
	try {
		return fn()
	} catch {
		return null
	}
}

function getDefaultValue<T>(def: DebugFlagDef<T>): T {
	const env =
		readEnv(() => process.env.TLDRAW_ENV) ??
		readEnv(() => process.env.VERCEL_PUBLIC_TLDRAW_ENV) ??
		readEnv(() => process.env.NEXT_PUBLIC_TLDRAW_ENV) ??
		// default to production because if we don't have one of these, this is probably a library use
		'production'

	switch (env) {
		case 'production':
			return def.defaults.production ?? def.defaults.all
		case 'preview':
		case 'staging':
			return def.defaults.staging ?? def.defaults.all
		default:
			return def.defaults.development ?? def.defaults.all
	}
}

interface Defaults<T> {
	development?: T
	staging?: T
	production?: T
	all: T
}

/** @internal */
export interface DebugFlagDef<T> {
	name: string
	defaults: Defaults<T>
	shouldStoreForSession: boolean
}

/** @internal */
export type DebugFlag<T> = DebugFlagDef<T> & Atom<T>
