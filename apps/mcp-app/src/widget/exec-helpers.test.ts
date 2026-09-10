// @vitest-environment jsdom
import type { Editor } from 'tldraw'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Regression coverage for the "Illegal invocation" exec failure.
 *
 * Chromium's window.setTimeout brand-checks its receiver: invoking a captured
 * reference as a method of another object (`captured.setTimeout(...)`) throws
 * "TypeError: Illegal invocation". The exec timeout race used to do exactly
 * that, so its promise rejected synchronously and any exec code containing an
 * `await` lost the race and reported "Illegal invocation" while its shapes
 * kept appearing.
 *
 * jsdom's timers don't brand-check, so this suite installs a simulated
 * brand-checking setTimeout BEFORE exec-helpers captures its globals at module
 * load. A regression to the unbound invocation makes the async test below fail
 * with exactly the production error.
 */

let executeCode: typeof import('./exec-helpers').executeCode

beforeAll(async () => {
	const native = window.setTimeout.bind(window)
	function brandCheckedSetTimeout(this: unknown, ...args: Parameters<typeof setTimeout>) {
		if (this !== window && this !== undefined && this !== globalThis) {
			throw new TypeError('Illegal invocation')
		}
		return native(...args)
	}
	window.setTimeout = brandCheckedSetTimeout as unknown as typeof window.setTimeout

	// executeCode resolves the focused proxy's method map from the widget
	// bootstrap; an empty map means every editor call passes through, which is
	// fine — these tests never touch the editor.
	;(window as { __TLDRAW_BOOTSTRAP__?: unknown }).__TLDRAW_BOOTSTRAP__ = { methodMap: {} }

	// Import AFTER the brand check is installed so the module captures the
	// simulated timer, exactly as it captures Chromium's native one.
	;({ executeCode } = await import('./exec-helpers'))
	// The import transforms the whole tldraw package on a cold cache, which can
	// exceed vitest's default 10s hook timeout in CI.
}, 60_000)

// The Blob-URL module loader cannot run under vitest (Node cannot import
// blob: URLs); compile the exec module with an async Function instead. The
// sandbox and timeout-race behavior under test is unaffected.
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
	...args: string[]
) => (editor: unknown, helpers: unknown) => Promise<unknown>

async function loadModule(code: string) {
	const compiled = new AsyncFunction('editor', 'helpers', code)
	return async ({ editor, helpers }: { editor: Editor; helpers: unknown }) =>
		compiled(editor, helpers)
}

const stubEditor = {} as Editor

describe('the simulated brand check', () => {
	it('throws Illegal invocation for object-method calls, like Chromium', () => {
		const captured = { setTimeout: window.setTimeout }
		expect(() => captured.setTimeout(() => {}, 1)).toThrow('Illegal invocation')
	})

	it('allows window-bound calls', () => {
		const bound = window.setTimeout.bind(window)
		const id = bound(() => {}, 1)
		expect(id).toBeDefined()
		clearTimeout(id)
	})
})

describe('executeCode timeout race', () => {
	it('completes async exec code (the case that used to report Illegal invocation)', async () => {
		const result = await executeCode(
			stubEditor,
			'await new Promise((resolve) => queueMicrotask(resolve)); return 42',
			{ loadModule }
		)
		expect(result).toEqual({ success: true, result: 42 })
	})

	it('completes synchronous exec code', async () => {
		const result = await executeCode(stubEditor, 'return 1 + 2', { loadModule })
		expect(result).toEqual({ success: true, result: 3 })
	})

	it('reports runtime errors from exec code', async () => {
		const result = await executeCode(stubEditor, 'throw new Error("boom")', { loadModule })
		expect(result).toEqual({ success: false, error: 'boom' })
	})

	it('restores the sandboxed globals after execution', async () => {
		await executeCode(stubEditor, 'return 0', { loadModule })
		expect(typeof window.setTimeout).toBe('function')
		expect(typeof window.fetch).toBe('function')
	})
})
