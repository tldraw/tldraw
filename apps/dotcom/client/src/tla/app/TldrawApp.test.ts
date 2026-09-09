import { atom, promiseWithResolve } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TldrawApp } from './TldrawApp'

function createAppStub({
	queryComplete = Promise.resolve(),
	changesFlushed = Promise.resolve(),
	user = undefined as { id: string } | undefined,
} = {}) {
	return Object.assign(Object.create(TldrawApp.prototype), {
		userId: 'user:test',
		getToken: async () => 'token',
		z: { preload: () => ({ complete: queryComplete }) },
		changesFlushed,
		user$: atom('user', user),
	}) as TldrawApp
}

describe('TldrawApp.preload', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
	})

	it.each([undefined, { id: 'user:test' }])(
		'times out a stalled Zero query with user %j',
		async (user) => {
			const app = createAppStub({ queryComplete: promiseWithResolve<void>(), user })
			const rejected = vi.fn()
			void app.preload().catch(rejected)

			await vi.advanceTimersByTimeAsync(30_000)

			expect(rejected).toHaveBeenCalledWith(new Error('Init failed: 503'))
			expect(vi.getTimerCount()).toBe(0)
		}
	)

	it('times out pending state updates', async () => {
		const app = createAppStub({ changesFlushed: promiseWithResolve<void>() })
		const rejected = vi.fn()
		void app.preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(30_000)

		expect(rejected).toHaveBeenCalledWith(new Error('Init failed: 503'))
	})

	it('shares the deadline between the query and user-record waits', async () => {
		const queryComplete = promiseWithResolve<void>()
		const rejected = vi.fn()
		void createAppStub({ queryComplete }).preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(29_000)
		queryComplete.resolve()
		await vi.advanceTimersByTimeAsync(999)
		expect(rejected).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)

		expect(rejected).toHaveBeenCalledWith(new Error('Init failed: 503'))
		expect(vi.getTimerCount()).toBe(0)
	})

	it.each([
		['zero query', { queryComplete: promiseWithResolve<void>() }],
		['state flush', { changesFlushed: promiseWithResolve<void>() }],
		['user record', {}],
	])('names the stalled %s stage after a successful init', async (stage, stub) => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)
		const rejected = vi.fn()
		void createAppStub(stub).preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(30_000)

		expect(rejected).toHaveBeenCalledWith(
			new Error(`Timed out waiting for the ${stage} after init`)
		)
	})

	it('loads an existing user after an init error and clears the deadline', async () => {
		await expect(createAppStub({ user: { id: 'user:test' } }).preload()).resolves.toBeUndefined()
		expect(vi.getTimerCount()).toBe(0)
	})
})
