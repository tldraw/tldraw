import { atom, promiseWithResolve } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TldrawApp } from './TldrawApp'
import { ZeroLogBuffer } from './ZeroLogBuffer'

function createAppStub({
	queryComplete = Promise.resolve(),
	workspaceComplete = Promise.resolve(),
	changesFlushed = Promise.resolve(),
	user = undefined as { id: string } | undefined,
	user$ = atom('user', user),
	zeroLog = new ZeroLogBuffer(),
	getToken = async (): Promise<string | undefined> => 'token',
} = {}) {
	return Object.assign(Object.create(TldrawApp.prototype), {
		userId: 'user:test',
		getToken,
		z: {
			// 1st call = user query, rest = workspace queries
			preload: vi
				.fn()
				.mockReturnValueOnce({ complete: queryComplete })
				.mockReturnValue({ complete: workspaceComplete }),
			connection: { state: { current: { name: 'connecting' } } },
		},
		changesFlushed,
		user$,
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
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
		visibilityState = 'visible'
		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState)
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it('loads an existing user without calling init', async () => {
		await expect(createAppStub({ user: { id: 'user:test' } }).preload()).resolves.toBeUndefined()
		expect(fetch).not.toHaveBeenCalled()
		expect(vi.getTimerCount()).toBe(0)
	})

	it('runs init once for a user Zero has no row for, then waits for the row', async () => {
		const user$ = atom('user', undefined as { id: string } | undefined)
		const resolved = vi.fn()
		void createAppStub({ user$ }).preload().then(resolved)

		await vi.advanceTimersByTimeAsync(0)
		expect(fetch).toHaveBeenCalledTimes(1)
		expect(resolved).not.toHaveBeenCalled()

		user$.set({ id: 'user:test' })
		await vi.advanceTimersByTimeAsync(0)

		expect(resolved).toHaveBeenCalled()
		expect(fetch).toHaveBeenCalledTimes(1)
		expect(vi.getTimerCount()).toBe(0)
	})

	it.each([
		['zero query', { queryComplete: promiseWithResolve<void>() }],
		['state flush', { changesFlushed: promiseWithResolve<void>() }],
		['user init', { hangInit: true }],
		['user record', {}],
		[
			'workspace data',
			{ workspaceComplete: promiseWithResolve<void>(), user: { id: 'user:test' } },
		],
	])('names the stalled %s stage', async (stage, { hangInit, ...stub }: any) => {
		if (hangInit) vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
		const rejected = vi.fn()
		void createAppStub(stub).preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(30_000)

		expect(rejected).toHaveBeenCalledWith(
			expect.objectContaining({ message: `Timed out waiting for the ${stage}` })
		)
		expect(vi.getTimerCount()).toBe(0)
	})

	it('does not call init before Zero confirms the row is missing', async () => {
		const queryComplete = promiseWithResolve<void>()
		void createAppStub({ queryComplete })
			.preload()
			.catch(() => {})

		await vi.advanceTimersByTimeAsync(10_000)
		expect(fetch).not.toHaveBeenCalled()
		queryComplete.resolve()
		await vi.advanceTimersByTimeAsync(0)
		expect(fetch).toHaveBeenCalledTimes(1)
	})

	it('does not call init before pending changes flush in the user row', async () => {
		const changesFlushed = promiseWithResolve<void>()
		const user$ = atom('user', undefined as { id: string } | undefined)
		const resolved = vi.fn()
		void createAppStub({ changesFlushed, user$ }).preload().then(resolved)

		await vi.advanceTimersByTimeAsync(0)
		user$.set({ id: 'user:test' })
		changesFlushed.resolve()
		await vi.advanceTimersByTimeAsync(0)

		expect(resolved).toHaveBeenCalled()
		expect(fetch).not.toHaveBeenCalled()
	})

	it('shares the deadline between the query, init, and user-record waits', async () => {
		const queryComplete = promiseWithResolve<void>()
		const rejected = vi.fn()
		void createAppStub({ queryComplete }).preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(29_000)
		queryComplete.resolve()
		await vi.advanceTimersByTimeAsync(999)
		expect(rejected).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)

		expect(rejected).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Timed out waiting for the user record' })
		)
		expect(vi.getTimerCount()).toBe(0)
	})

	it('attaches diagnostics to the timeout error', async () => {
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

	it.each([
		['a failed response', () => ({ ok: false, status: 503 }), 'Init failed: 503'],
		['a thrown request', () => Promise.reject(new TypeError('Failed to fetch')), 'Failed to fetch'],
	])('reports init failing with %s if the row never arrives', async (_, response, message) => {
		vi.mocked(fetch).mockImplementation(response as any)
		const rejected = vi.fn()
		void createAppStub().preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(29_999)
		expect(rejected).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)

		expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ message }))
		expect(rejected.mock.calls[0][0].diagnostics).toEqual(
			expect.objectContaining({ stage: 'user record' })
		)
		expect(fetch).toHaveBeenCalledTimes(1)
		expect(vi.getTimerCount()).toBe(0)
	})

	it.each([
		['no token', async () => undefined, 'No auth token available for init'],
		['a token error', () => Promise.reject(new Error('clerk down')), 'clerk down'],
	])('fails at once when init cannot be sent: %s', async (_, getToken, message) => {
		const rejected = vi.fn()
		void createAppStub({ getToken }).preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(0)

		expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ message }))
		expect(fetch).not.toHaveBeenCalled()
		expect(vi.getTimerCount()).toBe(0)
	})

	it('loads when the row arrives while init is still pending', async () => {
		vi.mocked(fetch).mockReturnValue(new Promise(() => {}))
		const user$ = atom('user', undefined as { id: string } | undefined)
		const resolved = vi.fn()
		void createAppStub({ user$ }).preload().then(resolved)

		await vi.advanceTimersByTimeAsync(2_000)
		user$.set({ id: 'user:test' })
		await vi.advanceTimersByTimeAsync(0)

		expect(resolved).toHaveBeenCalled()
		expect(vi.getTimerCount()).toBe(0)
	})

	it('loads when the row replicates after an init that failed post-commit', async () => {
		vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503 } as Response)
		const user$ = atom('user', undefined as { id: string } | undefined)
		const resolved = vi.fn()
		void createAppStub({ user$ }).preload().then(resolved)

		await vi.advanceTimersByTimeAsync(2_000)
		user$.set({ id: 'user:test' })
		await vi.advanceTimersByTimeAsync(0)

		expect(resolved).toHaveBeenCalled()
		expect(fetch).toHaveBeenCalledTimes(1)
		expect(vi.getTimerCount()).toBe(0)
	})

	it('only counts visible time and restarts the deadline on return from hidden', async () => {
		const rejected = vi.fn()
		visibilityState = 'hidden'
		void createAppStub().preload().catch(rejected)

		await vi.advanceTimersByTimeAsync(60_000)
		expect(rejected).not.toHaveBeenCalled()

		setVisibility('visible')
		await vi.advanceTimersByTimeAsync(29_000)
		setVisibility('hidden')
		await vi.advanceTimersByTimeAsync(60_000)
		expect(rejected).not.toHaveBeenCalled()

		setVisibility('visible')
		await vi.advanceTimersByTimeAsync(29_999)
		expect(rejected).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)

		expect(rejected.mock.calls[0][0].diagnostics).toEqual(
			expect.objectContaining({ hiddenMs: 120_000, visibilityState: 'visible' })
		)
		expect(vi.getTimerCount()).toBe(0)
	})

	it('settles without diagnostics when the caller aborts a hidden bootstrap', async () => {
		const rejected = vi.fn()
		const abort = new AbortController()
		visibilityState = 'hidden'
		void createAppStub().preload(abort.signal).catch(rejected)

		await vi.advanceTimersByTimeAsync(60_000)
		expect(rejected).not.toHaveBeenCalled()
		abort.abort()
		await vi.advanceTimersByTimeAsync(0)

		expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ name: 'AbortError' }))
		expect(rejected.mock.calls[0][0].diagnostics).toBeUndefined()
		expect(vi.getTimerCount()).toBe(0)
	})

	it('shares the deadline with the workspace stage', async () => {
		const queryComplete = promiseWithResolve<void>()
		const workspaceComplete = promiseWithResolve<void>()
		const rejected = vi.fn()
		void createAppStub({ queryComplete, workspaceComplete, user: { id: 'user:test' } })
			.preload()
			.catch(rejected)

		await vi.advanceTimersByTimeAsync(20_000)
		queryComplete.resolve()
		await vi.advanceTimersByTimeAsync(9_999)
		expect(rejected).not.toHaveBeenCalled()
		await vi.advanceTimersByTimeAsync(1)

		expect(rejected).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Timed out waiting for the workspace data' })
		)
		expect(vi.getTimerCount()).toBe(0)
	})
})

describe('ZeroLogBuffer', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('keeps the most recent lines and forwards warnings and errors to the console', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const buffer = new ZeroLogBuffer()

		for (let i = 0; i < 50; i++) buffer.log('info', undefined, `line ${i}`)
		buffer.log('warn', { wsid: 'w1' }, 'slow', { ms: 12 })
		buffer.log(
			'error',
			undefined,
			Object.assign(new Error('boom'), {
				kind: 'TransformFailed',
				errorBody: { status: 401 },
				cause: new Error('why'),
			})
		)

		const lines = buffer.recent()
		expect(lines).toHaveLength(40)
		expect(lines[0]).toMatch(/^\+\d+ms info line 12$/)
		expect(lines.at(-2)).toMatch(/ warn wsid=w1 slow {"ms":12}$/)
		expect(lines.at(-1)).toMatch(
			/ error Error: boom {"kind":"TransformFailed","errorBody":{"status":401}} \(cause: Error: why\)$/
		)
		expect(warn).toHaveBeenCalledWith({ wsid: 'w1' }, 'slow', { ms: 12 })
		expect(error).toHaveBeenCalledWith(expect.any(Error))
		expect(buffer.recent()).not.toBe(lines)
	})

	it('redacts tokens and truncates long lines', () => {
		const buffer = new ZeroLogBuffer()
		const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEifQ.c2lnbmF0dXJl'
		buffer.log('info', undefined, `["updateAuth",{"auth":"${jwt}"}]`)
		buffer.log('info', undefined, 'x'.repeat(300))

		const [auth, long] = buffer.recent()
		expect(auth).toContain('"auth":"eyJ<redacted>.eyJ<redacted>.c2lnbmF0dXJl"')
		expect(auth).not.toContain('eyJhbGci')
		expect(long).toHaveLength(251)
		expect(long.endsWith('…')).toBe(true)
	})
})
