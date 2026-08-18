import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildLokiPush, LokiEntry, pushToLoki, toLokiEntry } from './loki'
import { Environment } from './types'

function entry(partial: Partial<LokiEntry> = {}): LokiEntry {
	return {
		labels: {
			service_name: 'tldraw-multiplayer',
			env: 'production',
			entrypoint: 'TLFileDurableObject',
			handler: 'alarm',
			outcome: 'exception',
			error_name: 'TypeError',
		},
		timestampMs: 1_700_000_000_000,
		line: { message: 'x is not a function' },
		...partial,
	}
}

describe('buildLokiPush', () => {
	it('groups entries by label set', () => {
		const push = buildLokiPush([
			entry(),
			entry(),
			entry({ labels: { ...entry().labels, handler: 'ws_message' } }),
		])

		expect(push.streams.map((s) => s.values.length)).toEqual([2, 1])
	})

	it('emits nanosecond timestamps as strings', () => {
		const push = buildLokiPush([entry({ timestampMs: 1_700_000_000_000 })])

		expect(push.streams[0].values[0][0]).toBe('1700000000000000000')
	})

	it('sorts entries within a stream by timestamp', () => {
		const push = buildLokiPush([
			entry({ timestampMs: 3000, line: { message: 'third' } }),
			entry({ timestampMs: 1000, line: { message: 'first' } }),
			entry({ timestampMs: 2000, line: { message: 'second' } }),
		])

		expect(push.streams[0].values.map(([, line]) => JSON.parse(line).message)).toEqual([
			'first',
			'second',
			'third',
		])
	})

	it('sorts numerically, not lexicographically, across timestamp magnitudes', () => {
		const push = buildLokiPush([
			entry({ timestampMs: 1000, line: { message: 'second' } }),
			entry({ timestampMs: 999, line: { message: 'first' } }),
		])

		expect(push.streams[0].values.map(([, line]) => JSON.parse(line).message)).toEqual([
			'first',
			'second',
		])
	})
})

describe('toLokiEntry', () => {
	it('keeps slugs out of the payload and puts everything else in the line', () => {
		const item = {
			scriptName: 'tldraw-multiplayer',
			entrypoint: 'TLFileDurableObject',
			outcome: 'exception',
			scriptVersion: { id: 'v1' },
			durableObjectId: 'abc',
			eventTimestamp: 1_700_000_000_000,
			wallTime: 12,
			cpuTime: 3,
			truncated: false,
			logs: [{ timestamp: 1, level: 'error', message: ['boom'] }],
			exceptions: [
				{ name: 'TypeError', message: 'x is not a function', stack: 'at foo', timestamp: 1 },
			],
			event: { request: { method: 'POST', url: 'https://tldraw.com/api/connect/secret-slug' } },
		} as unknown as TraceItem

		const result = toLokiEntry(item, 'fetch', 'TypeError', 'production', undefined)

		expect(result.labels).toEqual({
			service_name: 'tldraw-multiplayer',
			env: 'production',
			entrypoint: 'TLFileDurableObject',
			handler: 'fetch',
			outcome: 'exception',
			error_name: 'TypeError',
		})
		expect(JSON.stringify(result.line)).not.toContain('secret-slug')
		expect(result.line).toMatchObject({
			durableObjectId: 'abc',
			scriptVersion: 'v1',
			message: 'x is not a function',
			stack: 'at foo',
			requestMethod: 'POST',
		})
	})

	it('records the websocket event kind and the rpc method', () => {
		const ws = {
			outcome: 'exception',
			exceptions: [],
			logs: [],
			event: { getWebSocketEvent: { webSocketEventType: 'close', code: 1006, wasClean: false } },
		} as unknown as TraceItem
		const rpc = {
			outcome: 'exception',
			exceptions: [],
			logs: [],
			event: { rpcMethod: 'handleFileEffect' },
		} as unknown as TraceItem

		expect(toLokiEntry(ws, 'ws_close', 'none', 'production', undefined).line).toMatchObject({
			webSocketEventType: 'close',
		})
		expect(
			toLokiEntry(rpc, 'rpc_handleFileEffect', 'none', 'production', undefined).line
		).toMatchObject({
			rpcMethod: 'handleFileEffect',
		})
	})

	it('falls back to Date.now() rather than the 1970 epoch when eventTimestamp is null', () => {
		const now = 1_800_000_000_000
		vi.useFakeTimers()
		vi.setSystemTime(now)
		try {
			const item = {
				outcome: 'ok',
				eventTimestamp: null,
				exceptions: [],
				logs: [],
				event: null,
			} as unknown as TraceItem

			expect(toLokiEntry(item, 'fetch', 'none', 'production', undefined).timestampMs).toBe(now)
		} finally {
			vi.useRealTimers()
		}
	})

	it('converts a room-not-found slug in the message, stack and exceptions to its durable object id', () => {
		const tldrDoc = {
			idFromName: (name: string) => ({ toString: () => `do(${name})` }),
		} as any
		const item = {
			outcome: 'exception',
			exceptions: [
				{
					name: 'RoomNotFoundError',
					message: 'Room not found: my-secret-slug',
					stack: 'RoomNotFoundError: Room not found: my-secret-slug\n    at foo',
					timestamp: 1,
				},
			],
			logs: [],
			event: null,
		} as unknown as TraceItem

		const result = toLokiEntry(item, 'fetch', 'RoomNotFoundError', 'production', tldrDoc)

		expect(result.line).toMatchObject({
			message: 'Room not found: do(/r/my-secret-slug)',
		})
		expect(result.line.stack).toContain('do(/r/my-secret-slug)')
		expect((result.line.exceptions as any[])[0].message).toBe(
			'Room not found: do(/r/my-secret-slug)'
		)
	})

	it('redacts a slug-bearing console log before it is stringified', () => {
		const tldrDoc = {
			idFromName: (name: string) => ({ toString: () => `do(${name})` }),
		} as any
		const item = {
			outcome: 'exception',
			exceptions: [],
			logs: [{ timestamp: 1, level: 'error', message: ['failed to fetch doc', 'my-secret-slug'] }],
			event: null,
		} as unknown as TraceItem

		const result = toLokiEntry(item, 'fetch', 'none', 'production', tldrDoc)

		expect(result.line.logs).toEqual([
			{ level: 'error', message: JSON.stringify(['failed to fetch doc', 'do(/r/my-secret-slug)']) },
		])
	})

	it('caps stack length and the number of exceptions carried', () => {
		const item = {
			outcome: 'exception',
			exceptions: Array.from({ length: 10 }, (_, i) => ({
				name: 'Error',
				message: `err ${i}`,
				stack: 'x'.repeat(20_000),
				timestamp: i,
			})),
			logs: [],
			event: null,
		} as unknown as TraceItem

		const result = toLokiEntry(item, 'fetch', 'Error', 'production', undefined)

		expect((result.line.exceptions as any[]).length).toBe(3)
		expect((result.line.stack as string).length).toBeLessThanOrEqual(8000)
		expect((result.line.exceptions as any[])[0].stack.length).toBeLessThanOrEqual(8000)
	})

	it('clips the handler label the same way error_name already is', () => {
		const item = {
			outcome: 'exception',
			exceptions: [],
			logs: [],
			event: null,
		} as unknown as TraceItem
		const longHandler = `rpc_${'x'.repeat(200)}`

		const result = toLokiEntry(item, longHandler, 'none', 'production', undefined)

		expect(result.labels.handler.length).toBeLessThanOrEqual(64)
	})
})

describe('pushToLoki', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	const env = {
		TAIL: undefined,
		TLDRAW_ENV: 'production',
		GRAFANA_LOKI_ENDPOINT: 'https://loki.test/loki/api/v1/push',
		GRAFANA_LOKI_USER: '848253',
		GRAFANA_LOKI_TOKEN: 'token',
	} as Environment

	it('posts one request with basic auth', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 204 }))
		vi.stubGlobal('fetch', fetchMock)

		await pushToLoki(env, [entry()])

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
		expect(url).toBe('https://loki.test/loki/api/v1/push')
		expect((init.headers as Record<string, string>)['Authorization']).toBe(
			`Basic ${btoa('848253:token')}`
		)
	})

	it('does not fetch at all for an empty batch', async () => {
		const fetchMock = vi.fn()
		vi.stubGlobal('fetch', fetchMock)

		await pushToLoki(env, [])

		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('swallows a transport failure', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('network down')
			})
		)

		await expect(pushToLoki(env, [entry()])).resolves.toBeUndefined()
	})

	it('records a push row with the response status for a non-ok response', async () => {
		const writeDataPoint = vi.fn()
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('', { status: 400 }))
		)

		await pushToLoki({ ...env, TAIL: { writeDataPoint } as any }, [entry(), entry()])

		expect(writeDataPoint).toHaveBeenCalledWith({ blobs: ['push', '400'], doubles: [2] })
	})

	it('records a transport_error push row when the fetch throws', async () => {
		const writeDataPoint = vi.fn()
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('network down')
			})
		)

		await pushToLoki({ ...env, TAIL: { writeDataPoint } as any }, [entry()])

		expect(writeDataPoint).toHaveBeenCalledWith({
			blobs: ['push', 'transport_error'],
			doubles: [1],
		})
	})
})
