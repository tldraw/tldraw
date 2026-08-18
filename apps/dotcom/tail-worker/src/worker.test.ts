import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from './types'
import worker, { aggregator } from './worker'

function makeEnv() {
	const writeDataPoint = vi.fn()
	const env = {
		TAIL: { writeDataPoint },
		// Same fake as screenshotTestHelpers.ts in the sync worker: a legible `do(<name>)` shows up in
		// an assertion rather than an opaque hash.
		TLDR_DOC: { idFromName: (name: string) => ({ toString: () => `do(${name})` }) },
		TLDRAW_ENV: 'production',
		GRAFANA_LOKI_ENDPOINT: 'https://loki.test/loki/api/v1/push',
		GRAFANA_LOKI_USER: '848253',
		GRAFANA_LOKI_TOKEN: 'token',
	} as unknown as Environment
	return { env, writeDataPoint }
}

function makeCtx() {
	return { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext
}

function traceItem(partial: Partial<TraceItem> = {}): TraceItem {
	return {
		scriptName: 'tldraw-multiplayer',
		entrypoint: 'TLFileDurableObject',
		scriptVersion: { id: 'v1' },
		durableObjectId: 'abc',
		outcome: 'ok',
		eventTimestamp: 1_700_000_000_000,
		wallTime: 7,
		cpuTime: 2,
		truncated: false,
		logs: [],
		exceptions: [],
		diagnosticsChannelEvents: [],
		executionModel: 'stateful',
		event: { getWebSocketEvent: { webSocketEventType: 'message' } },
		...partial,
	} as unknown as TraceItem
}

function rowsOfType(writeDataPoint: ReturnType<typeof vi.fn>, type: 'agg' | 'err') {
	return writeDataPoint.mock.calls
		.map(([point]) => point)
		.filter((point) => point.blobs[0] === type)
}

describe('tail handler', () => {
	beforeEach(() => {
		// The accumulator lives in module scope so it survives between invocations of the same isolate.
		// Clear it here so these cases stay independent even if the flush knobs are raised later.
		aggregator.drain(0)
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response('', { status: 204 }))
		)
	})

	it('accepts an empty batch without throwing or pushing anything', async () => {
		const { env, writeDataPoint } = makeEnv()
		const ctx = makeCtx()

		await worker.tail([], env, ctx)

		expect(writeDataPoint).not.toHaveBeenCalled()
		expect(ctx.waitUntil).not.toHaveBeenCalled()
	})

	it('tallies every invocation into one agg row per bucket', async () => {
		const { env, writeDataPoint } = makeEnv()

		await worker.tail(
			[traceItem(), traceItem(), traceItem({ outcome: 'canceled' })],
			env,
			makeCtx()
		)

		const agg = rowsOfType(writeDataPoint, 'agg')
		expect(agg).toHaveLength(2)
		expect(agg.map((row) => [row.blobs[4], row.doubles[0]])).toEqual([
			['ok', 2],
			['canceled', 1],
		])
	})

	it('tallies canceled and responseStreamDisconnected without pushing them to loki', async () => {
		const { env, writeDataPoint } = makeEnv()
		const ctx = makeCtx()

		await worker.tail(
			[
				traceItem({ outcome: 'ok' }),
				traceItem({ outcome: 'canceled' }),
				traceItem({ outcome: 'responseStreamDisconnected' }),
			],
			env,
			ctx
		)

		expect(rowsOfType(writeDataPoint, 'agg')).toHaveLength(3)
		expect(rowsOfType(writeDataPoint, 'err')).toHaveLength(0)
		expect(ctx.waitUntil).not.toHaveBeenCalled()
	})

	it('writes an err row and pushes to loki for an exception', async () => {
		const { env, writeDataPoint } = makeEnv()
		const ctx = makeCtx()

		await worker.tail(
			[
				traceItem({
					outcome: 'exception',
					event: { scheduledTime: new Date(0) } as any,
					exceptions: [
						{ name: 'TypeError', message: 'x is not a function', stack: 'at foo', timestamp: 1 },
					] as any,
				}),
			],
			env,
			ctx
		)

		const err = rowsOfType(writeDataPoint, 'err')
		expect(err).toHaveLength(1)
		expect(err[0].blobs.slice(3, 7)).toEqual([
			'alarm',
			'exception',
			'TypeError',
			'x is not a function',
		])
		expect(ctx.waitUntil).toHaveBeenCalledTimes(1)

		await (ctx.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(fetch).toHaveBeenCalledTimes(1)
	})

	it('pushes one request for a batch containing several errors', async () => {
		const { env } = makeEnv()
		const ctx = makeCtx()

		await worker.tail(
			[
				traceItem({ outcome: 'exception' }),
				traceItem({ outcome: 'exceededMemory' }),
				traceItem({ outcome: 'ok' }),
			],
			env,
			ctx
		)

		expect(ctx.waitUntil).toHaveBeenCalledTimes(1)
		await (ctx.waitUntil as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(fetch).toHaveBeenCalledTimes(1)
	})

	it('does not throw when the analytics binding is missing', async () => {
		const { env } = makeEnv()
		const ctx = makeCtx()

		await expect(
			worker.tail([traceItem()], { ...env, TAIL: undefined }, ctx)
		).resolves.toBeUndefined()
	})

	it('skips a malformed item without losing the rest of the batch', async () => {
		const { env, writeDataPoint } = makeEnv()
		const ctx = makeCtx()
		const poison = traceItem()
		Object.defineProperty(poison, 'event', {
			get() {
				throw new Error('boom')
			},
		})

		await worker.tail([poison, traceItem()], env, ctx)

		expect(rowsOfType(writeDataPoint, 'agg')).toHaveLength(1)
	})
})
