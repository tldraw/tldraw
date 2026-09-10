import { atom, promiseWithResolve } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TldrawApp } from './TldrawApp'
import { ZeroLogBuffer } from './ZeroLogBuffer'

function createAppStub({
	queryComplete = Promise.resolve(),
	changesFlushed = Promise.resolve(),
	user = undefined as { id: string } | undefined,
	zeroLog = new ZeroLogBuffer(),
} = {}) {
	return Object.assign(Object.create(TldrawApp.prototype), {
		userId: 'user:test',
		getToken: async () => 'token',
		z: {
			preload: () => ({ complete: queryComplete }),
			connection: { state: { current: { name: 'connecting' } } },
		},
		changesFlushed,
		user$: atom('user', user),
		zeroLog,
	}) as TldrawApp
}

let visibilityState: DocumentVisibilityState = 'visible'
function setVisibility(state: DocumentVisibilityState) {
	visibilityState = state
	document.dispatchEvent(new Event('visibilitychange'))
}

describe('TldrawApp.preload', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))
		visibilityState = 'visible'
		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
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

			expect(rejected).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Init failed: 503' })
			)
			expect(vi.getTimerCount()).toBe(0)
		}
	)

	it('times out pending state updates', async () => {
		const app = createAppStub({ changesFlushed: promiseWithResolve<void>() })
		const rejected = vi.fn()
		void app.preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(30_000)

		expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ message: 'Init failed: 503' }))
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

		expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ message: 'Init failed: 503' }))
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
			expect.objectContaining({
				message: `Timed out waiting for the ${stage} after init (zero connecting)`,
			})
		)
	})

	it('attaches diagnostics to the timeout error', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)
		const zeroLog = new ZeroLogBuffer()
		zeroLog.log('info', { clientID: 'c1' }, 'Connecting...')
		const rejected = vi.fn()
		void createAppStub({ zeroLog }).preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(30_000)

		expect(rejected.mock.calls[0][0].diagnostics).toEqual(
			expect.objectContaining({
				stage: 'user record',
				connection: 'connecting',
				visibilityState: 'visible',
				hiddenMs: 0,
				zeroLog: [expect.stringContaining('info clientID=c1 Connecting...')],
			})
		)
	})

	it('only counts visible time against the deadline', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: true } as Response)
		const rejected = vi.fn()
		visibilityState = 'hidden'
		void createAppStub().preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(60_000)
		expect(rejected).not.toHaveBeenCalled()

		setVisibility('visible')
		await vi.advanceTimersByTimeAsync(10_000)
		setVisibility('hidden')
		await vi.advanceTimersByTimeAsync(60_000)
		expect(rejected).not.toHaveBeenCalled()

		setVisibility('visible')
		await vi.advanceTimersByTimeAsync(19_999)
		expect(rejected).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)

		expect(rejected.mock.calls[0][0].diagnostics).toEqual(
			expect.objectContaining({ hiddenMs: 120_000, visibilityState: 'visible' })
		)
		expect(vi.getTimerCount()).toBe(0)
	})

	it('loads an existing user after an init error and clears the deadline', async () => {
		await expect(createAppStub({ user: { id: 'user:test' } }).preload()).resolves.toBeUndefined()
		expect(vi.getTimerCount()).toBe(0)
	})
})

describe('ZeroLogBuffer', () => {
	it('keeps the most recent lines and forwards warnings and errors to the console', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const buffer = new ZeroLogBuffer()

		for (let i = 0; i < 70; i++) buffer.log('info', undefined, `line ${i}`)
		buffer.log('warn', { wsid: 'w1' }, 'slow', { ms: 12 })
		buffer.log(
			'error',
			undefined,
			Object.assign(new Error('boom'), { kind: 'TransformFailed', errorBody: { status: 401 } })
		)

		const lines = buffer.recent()
		expect(lines).toHaveLength(60)
		expect(lines[0]).toContain('info  line 12')
		expect(lines.at(-2)).toContain('warn wsid=w1 slow {"ms":12}')
		expect(lines.at(-1)).toContain(
			'error  Error: boom {"kind":"TransformFailed","errorBody":{"status":401}}'
		)
		expect(warn).toHaveBeenCalledWith({ wsid: 'w1' }, 'slow', { ms: 12 })
		expect(error).toHaveBeenCalledWith(expect.any(Error))
		expect(buffer.recent()).not.toBe(lines)
	})
})
