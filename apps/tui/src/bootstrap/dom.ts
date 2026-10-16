import { JSDOM } from 'jsdom'
import { installPath2D } from './path2d'

export interface DomGlobals {
	window: Window & typeof globalThis
	dispose(): void
}

export interface InstallDomGlobalsOptions {
	/** Must be a non-opaque origin: jsdom's localStorage throws otherwise. Default http://localhost/ */
	url?: string
	/** Values written to `window.localStorage` before tldraw loads (TLDRAW_USER_DATA_v3 from prefs). */
	seedLocalStorage?: Record<string, string>
}

interface AnimationFrameProvider {
	requestAnimationFrame(cb: FrameRequestCallback): number
	cancelAnimationFrame(id: number): void
	pendingCount(): number
}

// Constructors and functions tldraw or TipTap may touch headlessly. Anything Node already provides
// (Event, EventTarget, Blob, AbortController, …) is left alone so Node internals keep working.
const JSDOM_GLOBALS = [
	'HTMLElement',
	'Element',
	'Node',
	'Text',
	'Comment',
	'Document',
	'DocumentFragment',
	'HTMLDivElement',
	'HTMLInputElement',
	'HTMLTextAreaElement',
	'HTMLImageElement',
	'HTMLCanvasElement',
	'HTMLAnchorElement',
	'SVGElement',
	'Image',
	'KeyboardEvent',
	'PointerEvent',
	'MouseEvent',
	'WheelEvent',
	'FocusEvent',
	'InputEvent',
	'CustomEvent',
	'UIEvent',
	'DOMRect',
	'DOMParser',
	'XMLSerializer',
	'Range',
	'Selection',
	'MutationObserver',
	'CSSStyleDeclaration',
	'File',
	'FileReader',
	'getComputedStyle',
]

// jsdom's storage must shadow Node's (Node 22 only has one behind a flag, as a getter that returns
// undefined): tldraw's storage helpers read the bare `localStorage` global.
const FORCED_GLOBALS = ['localStorage', 'sessionStorage']

let installed: DomGlobals | null = null
let fallbackFrames: AnimationFrameProvider | null = null

type AnyFn = (...args: unknown[]) => unknown

function forwardToGlobal(name: 'setTimeout' | 'clearTimeout' | 'setInterval' | 'clearInterval') {
	return (...args: unknown[]) => (globalThis as unknown as Record<string, AnyFn>)[name](...args)
}

function define(target: object, key: string, value: unknown) {
	Object.defineProperty(target, key, {
		configurable: true,
		enumerable: true,
		writable: true,
		value,
	})
}

/**
 * A setTimeout-based requestAnimationFrame used until a FrameScheduler is installed (and in tests
 * that never install one). It keeps `new Editor` working anywhere the DOM globals exist.
 */
function createFallbackAnimationFrame(): AnimationFrameProvider {
	const pending = new Map<number, NodeJS.Timeout>()
	let nextId = 0
	return {
		requestAnimationFrame(cb) {
			const id = ++nextId
			const timer = setTimeout(() => {
				pending.delete(id)
				cb(performance.now())
			}, 16)
			pending.set(id, timer)
			return id
		},
		cancelAnimationFrame(id) {
			const timer = pending.get(id)
			if (timer) {
				clearTimeout(timer)
				pending.delete(id)
			}
		},
		pendingCount() {
			return pending.size
		},
	}
}

function createMatchMedia(query: string): MediaQueryList {
	return {
		matches: false,
		media: query,
		onchange: null,
		addListener() {},
		removeListener() {},
		addEventListener() {},
		removeEventListener() {},
		dispatchEvent() {
			return false
		},
	} as unknown as MediaQueryList
}

// Node's native BroadcastChannel pins the event loop forever: TLUserPreferences.ts:246-248 opens one
// at import time whenever the global exists and NODE_ENV !== 'test'.
class BroadcastChannelStub {
	onmessage: null | ((e: unknown) => void) = null
	onmessageerror: null | ((e: unknown) => void) = null
	constructor(readonly name: string) {}
	addEventListener() {}
	removeEventListener() {}
	dispatchEvent() {
		return false
	}
	postMessage() {}
	close() {}
}

/**
 * Creates the jsdom window and installs everything tldraw reads at import time and at runtime.
 * Must run before `tldraw` is imported (environment.ts, debug-flags.ts, TLSessionStateSnapshot.ts
 * and TLUserPreferences.ts read `window`, `navigator`, storage and `BroadcastChannel` as modules
 * evaluate). Idempotent: a second call returns the first installation.
 */
export function installDomGlobals(opts: InstallDomGlobalsOptions = {}): DomGlobals {
	if (installed) return installed

	// pretendToBeVisual is deliberately off: it would add a setInterval-driven rAF competing with the
	// FrameScheduler.
	const dom = new JSDOM('<!doctype html><html><body></body></html>', {
		url: opts.url ?? 'http://localhost/',
	})
	const win = dom.window as unknown as Window & typeof globalThis
	const w = win as unknown as Record<string, unknown>
	const g = globalThis as unknown as Record<string, unknown>

	// `@tldraw/utils` Timers schedules through window.setTimeout/setInterval (timers.ts:82,103) but
	// Timers.dispose clears with the bare Node functions (timers.ts:197-199). jsdom timer ids are not
	// Node timer ids, so without this alias every editor timer leaks on dispose (verified: 13 timers
	// including a 60 ms CollaboratorsManager interval). The forwarders look the global up per call
	// so a swapped global (vitest fake timers) is seen on both sides instead of only on the bare one.
	w.setTimeout = forwardToGlobal('setTimeout')
	w.clearTimeout = forwardToGlobal('clearTimeout')
	w.setInterval = forwardToGlobal('setInterval')
	w.clearInterval = forwardToGlobal('clearInterval')

	define(globalThis, 'window', win)
	define(globalThis, 'document', win.document)
	define(globalThis, 'navigator', win.navigator)
	for (const key of JSDOM_GLOBALS) {
		if (!(key in globalThis) && w[key] !== undefined) define(globalThis, key, w[key])
	}
	for (const key of FORCED_GLOBALS) {
		define(globalThis, key, w[key])
	}

	// rAF on BOTH globals: FpsScheduler uses the bare global (throttle.ts:57), Timers uses
	// window.requestAnimationFrame (timers.ts:126). A FrameScheduler installed later replaces both.
	if (typeof g.requestAnimationFrame !== 'function') {
		fallbackFrames = createFallbackAnimationFrame()
		const request = (cb: FrameRequestCallback) => fallbackFrames!.requestAnimationFrame(cb)
		const cancel = (id: number) => fallbackFrames!.cancelAnimationFrame(id)
		g.requestAnimationFrame = request
		g.cancelAnimationFrame = cancel
		w.requestAnimationFrame = request
		w.cancelAnimationFrame = cancel
	} else {
		w.requestAnimationFrame = g.requestAnimationFrame
		w.cancelAnimationFrame = g.cancelAnimationFrame
	}

	if (typeof w.matchMedia !== 'function') w.matchMedia = createMatchMedia
	if (typeof g.matchMedia !== 'function') g.matchMedia = createMatchMedia

	define(globalThis, 'BroadcastChannel', BroadcastChannelStub)

	installPath2D(win)

	// environment.ts:62 probes `CSS.supports` for display-p3; false keeps the sRGB highlight colours.
	// jsdom has no CSS object, so one stub is shared by the window and the global (whichever exists).
	if (w.CSS === undefined) w.CSS = g.CSS ?? { supports: () => false }
	if (g.CSS === undefined) g.CSS = w.CSS

	if (opts.seedLocalStorage) {
		for (const [key, value] of Object.entries(opts.seedLocalStorage)) {
			win.localStorage.setItem(key, value)
		}
	}

	installed = {
		window: win,
		dispose() {
			if (installed !== this) return
			installed = null
			win.close()
		},
	}
	return installed
}

/** The current installation, if any. */
export function getDomGlobals(): DomGlobals | null {
	return installed
}

/** Pending callbacks on the setTimeout-based rAF fallback (0 when a FrameScheduler owns rAF). */
export function getFallbackAnimationFramePendingCount(): number {
	return fallbackFrames?.pendingCount() ?? 0
}
