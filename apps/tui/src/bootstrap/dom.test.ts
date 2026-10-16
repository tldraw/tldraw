import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDomGlobals, installDomGlobals } from './dom'
import { Path2DPolyfill } from './path2d'

describe('installDomGlobals', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('is idempotent: later calls return the installation made by the test setup', () => {
		const first = getDomGlobals()
		expect(first).not.toBeNull()
		expect(installDomGlobals()).toBe(first)
		expect(installDomGlobals({ url: 'http://elsewhere/', seedLocalStorage: { x: '1' } })).toBe(
			first
		)
		expect(first!.window).toBe(globalThis.window)
		expect(window.localStorage.getItem('x')).toBeNull()
	})

	it('installs the jsdom window, document and navigator with a non-opaque origin', () => {
		expect(window.location.href).toBe('http://localhost/')
		expect(globalThis.document).toBe(window.document)
		expect(document.body).toBeInstanceOf(HTMLElement)
		expect(document.createElement('div')).toBeInstanceOf(HTMLDivElement)
		expect(typeof navigator.userAgent).toBe('string')
		// Storage only works on a non-opaque origin; tldraw reads TLDRAW_USER_DATA_v3 at editor init.
		window.localStorage.setItem('tui-test', '1')
		expect(window.localStorage.getItem('tui-test')).toBe('1')
		window.localStorage.removeItem('tui-test')
		expect(window.sessionStorage.getItem('tui-test')).toBeNull()
	})

	it('stubs matchMedia, CSS.supports and BroadcastChannel', () => {
		const query = window.matchMedia('(prefers-color-scheme: dark)')
		expect(query.matches).toBe(false)
		expect(query.media).toBe('(prefers-color-scheme: dark)')
		expect(() => {
			query.addEventListener('change', () => {})
			query.removeEventListener('change', () => {})
		}).not.toThrow()
		expect(globalThis.matchMedia('(any-pointer: coarse)').matches).toBe(false)

		expect(CSS.supports('color', 'color(display-p3 1 1 1)')).toBe(false)
		expect(window.CSS).toBe(globalThis.CSS)

		// Node's own BroadcastChannel would pin the event loop; the stub has no port behind it.
		expect(BroadcastChannel.name).toBe('BroadcastChannelStub')
		const channel = new BroadcastChannel('tldraw')
		expect(channel.name).toBe('tldraw')
		expect(() => {
			channel.addEventListener('message', () => {})
			channel.postMessage({ hello: 'world' })
			channel.close()
		}).not.toThrow()
	})

	it('routes window timers through the Node globals so ids are interchangeable', () => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
		const fired = vi.fn()
		const cancelled = vi.fn()
		const cancelledByWindow = vi.fn()
		const ticks = vi.fn()
		window.setTimeout(fired, 10)
		// Scheduled through the window, cleared through the bare global: what Timers.dispose does.
		clearTimeout(window.setTimeout(cancelled, 10))
		window.clearTimeout(setTimeout(cancelledByWindow, 10))
		const interval = window.setInterval(ticks, 5)
		vi.advanceTimersByTime(10)
		expect(fired).toHaveBeenCalledTimes(1)
		expect(cancelled).not.toHaveBeenCalled()
		expect(cancelledByWindow).not.toHaveBeenCalled()
		expect(ticks).toHaveBeenCalledTimes(2)
		clearInterval(interval)
		vi.advanceTimersByTime(10)
		expect(ticks).toHaveBeenCalledTimes(2)
	})

	it('provides requestAnimationFrame on both globals, backed by one implementation', async () => {
		expect(typeof globalThis.requestAnimationFrame).toBe('function')
		expect(window.requestAnimationFrame).toBe(globalThis.requestAnimationFrame)
		expect(window.cancelAnimationFrame).toBe(globalThis.cancelAnimationFrame)
		const cancelled = vi.fn()
		globalThis.cancelAnimationFrame(window.requestAnimationFrame(cancelled))
		const time = await new Promise<number>((resolve) => globalThis.requestAnimationFrame(resolve))
		expect(typeof time).toBe('number')
		expect(cancelled).not.toHaveBeenCalled()
	})

	it('installs one Path2D class on globalThis and the window so instanceof holds either way', () => {
		expect(globalThis.Path2D).toBe(Path2DPolyfill)
		expect(window.Path2D).toBe(globalThis.Path2D)
		expect(new window.Path2D('M0 0 L1 1')).toBeInstanceOf(globalThis.Path2D)
		expect(new Path2D()).toBeInstanceOf(window.Path2D)
		expect(new Path2D('M0 0 L1 1')).toBeInstanceOf(Path2DPolyfill)
	})
})
