import { atom, react } from 'signia'

// --- 1. DEFINE ---
// Define your debug flags here. Call `createDebugValue` with the name you want
// your value to be available as on `window` and the initial value. If you don't
// want your value to be stored in session storage, pass `false` as the 3rd arg

/** @internal */
export const debugFlags = {
	// --- FEATURE FLAGS ---
	peopleMenu: createFeatureFlag('peopleMenu'),

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
	logMessages: createDebugValue('uiLog', { defaults: { all: [] } }),
	resetConnectionEveryPing: createDebugValue('resetConnectionEveryPing', {
		defaults: { all: false },
	}),
	debugCursors: createDebugValue('debugCursors', {
		defaults: { all: false },
	}),
}

declare global {
	interface Window {
		tldrawLog: (message: any) => void
	}
}

if (typeof window !== 'undefined') {
	window.tldrawLog = (message: any) => {
		debugFlags.logMessages.set(debugFlags.logMessages.value.concat(message))
	}
}

// --- 2. USE ---
// In normal code, read from debug flags directly by calling .value on them:
//    if (debugFlags.preventDefaultLogging.value) { ... }
//
// In react, wrap your reads in `useValue` so they react to changes:
//    const shouldLog = useValue(debugFlags.preventDefaultLogging)

// --- 3. GET FUNKY ---
// If you need to do fun stuff like monkey-patching in response to flag changes,
// add that here. Make sure you wrap your code in `react` so it runs
// automatically when values change!

if (typeof Element !== 'undefined') {
	const nativeElementRemoveChild = Element.prototype.removeChild
	react('element removal logging', () => {
		if (debugFlags.elementRemovalLogging.value) {
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
		isFeatureFlag: false,
		name,
		defaults,
		shouldStoreForSession,
	})
}
function createFeatureFlag(
	name: string,
	defaults: Defaults<boolean> = { all: true, production: false }
) {
	return createDebugValueBase({
		isFeatureFlag: true,
		name,
		defaults,
		shouldStoreForSession: true,
	})
}

function createDebugValueBase<Def extends DebugFlagDef<any> | FeatureFlagDef>(
	def: Def
): DebugFlag<Def> {
	const defaultValue = getDefaultValue(def)
	const storedValue = def.shouldStoreForSession
		? (getStoredInitialValue(def.name) as DefValue<Def> | null)
		: null
	const value = atom(`debug:${def.name}`, storedValue ?? defaultValue)

	if (typeof window !== 'undefined') {
		if (def.shouldStoreForSession) {
			react(`debug:${def.name}`, () => {
				const currentValue = value.value
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

		Object.defineProperty(window, `tldraw_${def.name}`, {
			get() {
				return value.value
			},
			set(newValue) {
				value.set(newValue)
			},
			configurable: true,
		})
	}

	return {
		...def,
		get value() {
			return value.value
		},
		set(newValue) {
			return value.set(newValue)
		},
	}
}

function getStoredInitialValue(name: string) {
	try {
		return JSON.parse(window?.sessionStorage.getItem(`tldraw_debug:${name}`) ?? 'null')
	} catch (err) {
		return null
	}
}

function getDefaultValue<Def extends DebugFlagDefBase<any>>(def: Def): DefValue<Def> {
	const p = typeof process !== 'undefined' ? process : null
	const env =
		(import.meta as any)?.env?.TLDRAW_ENV ??
		p?.env?.TLDRAW_ENV ??
		p?.env?.VERCEL_PUBLIC_TLDRAW_ENV ??
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
export interface DebugFlagDefBase<T> {
	name: string
	defaults: Defaults<T>
	shouldStoreForSession: boolean
}

/** @internal */
export interface DebugFlagDef<T> extends DebugFlagDefBase<T> {
	isFeatureFlag: false
}

/** @internal */
export interface FeatureFlagDef extends DebugFlagDefBase<boolean> {
	isFeatureFlag: true
}

type DefValue<Def extends DebugFlagDefBase<any>> = Def extends DebugFlagDefBase<infer T>
	? T
	: boolean

/** @internal */
export type DebugFlag<Def extends DebugFlagDefBase<any>> = Def & {
	value: DefValue<Def>
	set: (value: DefValue<Def>) => void
	// def: Def
}
