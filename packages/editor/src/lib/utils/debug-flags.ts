import { Atom, atom, react } from '@tldraw/state'
import { deleteFromSessionStorage, getFromSessionStorage, setInSessionStorage } from '@tldraw/utils'

// --- 1. DEFINE ---
//
// Define your debug values and feature flags here. Use `createDebugValue` to
// create an arbitrary value with defaults for production, staging, and
// development. Use `createFeatureFlag` to create a boolean flag which will be
// `true` by default in development and staging, and `false` in production.
/** @internal */
export const featureFlags: Record<string, DebugFlag<boolean>> = {}

/** @internal */
export const pointerCaptureTrackingObject = createDebugValue(
	'pointerCaptureTrackingObject',
	// ideally we wouldn't store this mutable value in an atom but it's not
	// a big deal for debug values
	{
		defaults: { all: new Map<Element, number>() },
		shouldStoreForSession: false,
	}
)

/** @internal */
export const debugFlags = {
	// --- DEBUG VALUES ---
	logPreventDefaults: createDebugValue('logPreventDefaults', {
		defaults: { all: false },
	}),
	logPointerCaptures: createDebugValue('logPointerCaptures', {
		defaults: { all: false },
	}),
	logElementRemoves: createDebugValue('logElementRemoves', {
		defaults: { all: false },
	}),
	debugSvg: createDebugValue('debugSvg', {
		defaults: { all: false },
	}),
	showFps: createDebugValue('showFps', {
		defaults: { all: false },
	}),
	measurePerformance: createDebugValue('measurePerformance', { defaults: { all: false } }),
	throwToBlob: createDebugValue('throwToBlob', {
		defaults: { all: false },
	}),
	reconnectOnPing: createDebugValue('reconnectOnPing', {
		defaults: { all: false },
	}),
	debugCursors: createDebugValue('debugCursors', {
		defaults: { all: false },
	}),
	forceSrgb: createDebugValue('forceSrgbColors', { defaults: { all: false } }),
	debugGeometry: createDebugValue('debugGeometry', { defaults: { all: false } }),
	hideShapes: createDebugValue('hideShapes', { defaults: { all: false } }),
	editOnType: createDebugValue('editOnType', { defaults: { all: false } }),
	a11y: createDebugValue('a11y', { defaults: { all: false } }),
	debugElbowArrows: createDebugValue('debugElbowArrows', { defaults: { all: false } }),
	useSpatialIndex: createDebugValue('useSpatialIndex', {
		defaults: {
			development: true,
			staging: true,
			production: false,
			all: false,
		},
	}),
	perfLogging: createDebugValue('perfLogging', {
		defaults: {
			development: true,
			staging: false,
			production: false,
			all: false,
		},
	}),
	perfLogCulling: createDebugValue('perfLogCulling', {
		defaults: { all: false },
	}),
	perfLogSelection: createDebugValue('perfLogSelection', {
		defaults: { all: false },
	}),
	perfLogGetShapeAtPoint: createDebugValue('perfLogGetShapeAtPoint', {
		defaults: { all: false },
	}),
	perfLogGetShapesAtPoint: createDebugValue('perfLogGetShapesAtPoint', {
		defaults: { all: false },
	}),
	perfLogSpatialIndex: createDebugValue('perfLogSpatialIndex', {
		defaults: { all: false },
	}),
	perfLogPageChange: createDebugValue('perfLogPageChange', {
		defaults: { all: false },
	}),
	perfLogReactRender: createDebugValue('perfLogReactRender', {
		defaults: { all: false },
	}),
} as const

/**
 * Tracks performance metrics for repeated operations and prints averages after inactivity
 *
 * @public
 */
export class PerfTracker {
	private metrics = new Map<
		string,
		{ times: number[]; lastTime: number; timeout: ReturnType<typeof setTimeout> | null }
	>()
	private sessionAverages = new Map<string, { avg: number; count: number; extraInfo?: string }>()
	private readonly inactivityMs = 1000

	/**
	 * Reset session averages (clears comparison history)
	 *
	 * @public
	 */
	resetSession() {
		this.sessionAverages.clear()
		// eslint-disable-next-line no-console
		console.log(
			`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
				`🔄 [Session Reset] Performance comparison history cleared\n` +
				`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
		)
	}

	track(operation: string, timeMs: number, extraInfo?: string) {
		if (!this.metrics.has(operation)) {
			this.metrics.set(operation, { times: [], lastTime: Date.now(), timeout: null })
		}

		const metric = this.metrics.get(operation)!

		// Clear existing timeout
		if (metric.timeout) {
			clearTimeout(metric.timeout)
		}

		// Add this timing
		metric.times.push(timeMs)
		metric.lastTime = Date.now()

		// Set new timeout to print stats after inactivity
		// eslint-disable-next-line no-restricted-globals
		metric.timeout = setTimeout(() => {
			this.printStats(operation, extraInfo)
			metric.times = []
			metric.timeout = null
		}, this.inactivityMs)
	}

	private printStats(operation: string, extraInfo?: string) {
		const metric = this.metrics.get(operation)
		if (!metric || metric.times.length === 0) return

		const times = metric.times
		const count = times.length
		const sum = times.reduce((a, b) => a + b, 0)
		const avg = sum / count
		const min = Math.min(...times)
		const max = Math.max(...times)

		// Store this session's average
		this.sessionAverages.set(operation, { avg, count, extraInfo })

		const extra = extraInfo ? ` (${extraInfo})` : ''
		const output =
			`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
			`📊 [Perf Summary] ${operation}\n` +
			`   ${count} operations | avg: ${avg.toFixed(2)}ms | min: ${min.toFixed(2)}ms | max: ${max.toFixed(2)}ms${extra}\n` +
			`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`

		// eslint-disable-next-line no-console
		console.log(output)

		// Try to find comparison with alternate implementation
		// Only show comparison if we have at least 5 operations in current session
		const comparison = this.findComparison(operation)
		if (comparison && count >= 5) {
			this.printComparison(operation, avg, count, comparison)
			// Clear all session data after printing comparison
			this.sessionAverages.clear()
			// eslint-disable-next-line no-console
			console.log(
				`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
					`🗑️  [Comparison history cleared]\n` +
					`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
			)
		}
	}

	private printComparison(
		operation: string,
		currentAvg: number,
		currentCount: number,
		comparison: { operation: string; avg: number; count: number }
	) {
		// Extract implementation names for clearer labels
		const currentImpl = operation.match(/\((.+?)\)$/)?.[1] || operation
		const comparisonImpl = comparison.operation.match(/\((.+?)\)$/)?.[1] || comparison.operation

		// Always use "old" as baseline
		let baselineAvg: number
		let baselineImpl: string
		let baselineCount: number
		let testAvg: number
		let testImpl: string
		let testCount: number

		if (comparisonImpl === 'old') {
			// Comparison is old, use it as baseline
			baselineAvg = comparison.avg
			baselineImpl = comparisonImpl
			baselineCount = comparison.count
			testAvg = currentAvg
			testImpl = currentImpl
			testCount = currentCount
		} else if (currentImpl === 'old') {
			// Current is old, use it as baseline (swap)
			baselineAvg = currentAvg
			baselineImpl = currentImpl
			baselineCount = currentCount
			testAvg = comparison.avg
			testImpl = comparisonImpl
			testCount = comparison.count
		} else {
			// Neither is old, fall back to current order
			baselineAvg = comparison.avg
			baselineImpl = comparisonImpl
			baselineCount = comparison.count
			testAvg = currentAvg
			testImpl = currentImpl
			testCount = currentCount
		}

		// Calculate diff: test - baseline
		// Negative = test faster (good), Positive = test slower (bad)
		const diff = testAvg - baselineAvg
		const diffPercent = ((diff / baselineAvg) * 100).toFixed(1)
		const symbol = diff < 0 ? '🟢' : '🔴'
		const sign = diff > 0 ? '+' : ''
		const faster = diff < 0 ? 'faster' : 'slower'

		const output =
			`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
			`\x1b[1m${symbol} [Implementation Comparison]\x1b[0m\n` +
			`   ${testImpl} (now):      ${testAvg.toFixed(2)}ms avg (${testCount} ops)\n` +
			`   ${baselineImpl} (baseline): ${baselineAvg.toFixed(2)}ms avg (${baselineCount} ops)\n` +
			`   \x1b[1mΔ ${sign}${diff.toFixed(2)}ms (${sign}${diffPercent}%) ${faster}\x1b[0m\n` +
			`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`

		// eslint-disable-next-line no-console
		console.log(output)
	}

	private findComparison(operation: string): {
		operation: string
		avg: number
		count: number
	} | null {
		// Extract base operation name and current implementation
		// e.g. "notVisibleShapes (spatial)" -> base: "notVisibleShapes", impl: "spatial"
		const match = operation.match(/^(.+?)\s*\((.+?)\)$/)
		if (!match) return null

		const [, baseOp, currentImpl] = match

		// Look for other implementations of the same base operation
		for (const [otherOp, data] of this.sessionAverages.entries()) {
			if (otherOp === operation) continue // Skip self

			const otherMatch = otherOp.match(/^(.+?)\s*\((.+?)\)$/)
			if (!otherMatch) continue

			const [, otherBaseOp, otherImpl] = otherMatch

			// Same base operation, different implementation
			if (otherBaseOp === baseOp && otherImpl !== currentImpl) {
				return {
					operation: otherOp,
					avg: data.avg,
					count: data.count,
				}
			}
		}

		return null
	}
}

/** @public */
export const perfTracker = new PerfTracker()

// Expose reset function globally for easy access
if (typeof window !== 'undefined') {
	;(window as any).tldrawResetPerfSession = () => perfTracker.resetSession()
}

declare global {
	interface Window {
		tldrawLog(message: any): void
		tldrawResetPerfSession(): void
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
		if (debugFlags.logElementRemoves.get()) {
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
/** @public */
export function createDebugValue<T>(
	name: string,
	{
		defaults,
		shouldStoreForSession = true,
	}: { defaults: DebugFlagDefaults<T>; shouldStoreForSession?: boolean }
) {
	return createDebugValueBase({
		name,
		defaults,
		shouldStoreForSession,
	})
}

// function createFeatureFlag<T>(
// 	name: string,
// 	{
// 		defaults,
// 		shouldStoreForSession = true,
// 	}: { defaults: DebugFlagDefaults<T>; shouldStoreForSession?: boolean }
// ) {
// 	return createDebugValueBase({
// 		name,
// 		defaults,
// 		shouldStoreForSession,
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
				if (currentValue === defaultValue) {
					deleteFromSessionStorage(`tldraw_debug:${def.name}`)
				} else {
					setInSessionStorage(`tldraw_debug:${def.name}`, JSON.stringify(currentValue))
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

	return Object.assign(valueAtom, def, {
		reset: () => valueAtom.set(defaultValue),
	})
}

function getStoredInitialValue(name: string) {
	try {
		return JSON.parse(getFromSessionStorage(`tldraw_debug:${name}`) ?? 'null')
	} catch {
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

/** @public */
export interface DebugFlagDefaults<T> {
	development?: T
	staging?: T
	production?: T
	all: T
}

/** @public */
export interface DebugFlagDef<T> {
	name: string
	defaults: DebugFlagDefaults<T>
	shouldStoreForSession: boolean
}

/** @public */
export interface DebugFlag<T> extends DebugFlagDef<T>, Atom<T> {
	reset(): void
}
