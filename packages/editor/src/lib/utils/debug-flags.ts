import { atom, Atom, react } from 'signia'

// --- 1. DEFINE ---
// Define your debug flags here. Call `createDebugValue` with the name you want
// your value to be available as on `window` and the initial value. If you don't
// want your value to be stored in session storage, pass `false` as the 3rd arg

/** @internal */
export const debugFlags = {
	preventDefaultLogging: createDebugValue('tldrawPreventDefaultLogging', false),
	pointerCaptureLogging: createDebugValue('tldrawPointerCaptureLogging', false),
	pointerCaptureTracking: createDebugValue('tldrawPointerCaptureTracking', false),
	pointerCaptureTrackingObject: createDebugValue(
		'tldrawPointerCaptureTrackingObject',
		// ideally we wouldn't store this mutable value in an atom but it's not
		// a big deal for debug values
		new Map<Element, number>(),
		false
	),
	elementRemovalLogging: createDebugValue('tldrawElementRemovalLogging', false),
	debugSvg: createDebugValue('tldrawDebugSvg', false),
	throwToBlob: createDebugValue('tldrawThrowToBlob', false),
	peopleMenu: createDebugValue('tldrawPeopleMenu', false),
	logMessages: createDebugValue('TldrawEditorUiLog', []),
	resetConnectionEveryPing: createDebugValue('tldrawResetConnectionEveryPing', false),
	debugCursors: createDebugValue('tldrawDebugCursors', false),
}

declare global {
	interface Window {
		tldrawLog: (message: any) => void
	}
}
debugFlags.logMessages.set([])

if (typeof window !== 'undefined') {
	window.tldrawLog = (message: any) => {
		debugFlags.logMessages.set(debugFlags.logMessages.value.concat(message))
	}
}

// --- 2. USE ---
// In normal code, read from debug flags directly by calling .get() on them:
//    if (debugFlags.preventDefaultLogging.get()) { ... }
//
// In react, wrap your reads in `useDerivedValue` so they react to changes:
//    const shouldLog = useDerivedValue(() => debugFlags.preventDefaultLogging.get())

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
function createDebugValue<T>(name: string, initialValue: T, shouldStore = true): Atom<T> {
	if (typeof window === 'undefined') {
		return atom(`debug:${name}`, initialValue)
	}

	const storedValue = shouldStore ? (getStoredInitialValue(name) as T | null) : null
	const value = atom(`debug:${name}`, storedValue ?? initialValue)

	if (shouldStore) {
		react(`debug:${name}`, () => {
			const currentValue = value.value
			try {
				if (currentValue === initialValue) {
					window.sessionStorage.removeItem(`debug:${name}`)
				} else {
					window.sessionStorage.setItem(`debug:${name}`, JSON.stringify(currentValue))
				}
			} catch {
				// not a big deal
			}
		})
	}

	Object.defineProperty(window, name, {
		get() {
			return value.value
		},
		set(newValue) {
			value.set(newValue)
		},
		configurable: true,
	})

	return value
}

function getStoredInitialValue(name: string) {
	try {
		return JSON.parse(window.sessionStorage.getItem(`debug:${name}`) ?? 'null')
	} catch (err) {
		return null
	}
}
