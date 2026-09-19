import { describe, expect, it } from 'vitest'
import {
	bucketFlags,
	classifyHandler,
	entrypointOf,
	isErrorOutcome,
	scriptNameOf,
	scriptVersionOf,
	WALL_TIME_BUCKETS_MS,
} from './classify'

function item(partial: Partial<TraceItem>): TraceItem {
	return partial as TraceItem
}

describe('classifyHandler', () => {
	it('returns unknown when there is no event', () => {
		expect(classifyHandler(item({ event: null }))).toBe('unknown')
	})

	it('classifies scheduled before alarm, because both carry scheduledTime', () => {
		expect(classifyHandler(item({ event: { scheduledTime: 1, cron: '* * * * *' } as any }))).toBe(
			'scheduled'
		)
	})

	it('classifies an alarm', () => {
		expect(classifyHandler(item({ event: { scheduledTime: new Date(0) } as any }))).toBe('alarm')
	})

	it('classifies each websocket hibernation event kind', () => {
		const kinds = ['message', 'close', 'error']
		const results = kinds.map((webSocketEventType) =>
			classifyHandler(item({ event: { getWebSocketEvent: { webSocketEventType } } as any }))
		)
		expect(results).toEqual(['ws_message', 'ws_close', 'ws_error'])
	})

	it('falls back to ws_unknown for an unrecognised websocket event kind', () => {
		expect(
			classifyHandler(
				item({ event: { getWebSocketEvent: { webSocketEventType: 'nonsense' } } as any })
			)
		).toBe('ws_unknown')
	})

	it('classifies an RPC call by method name', () => {
		expect(classifyHandler(item({ event: { rpcMethod: 'handleFileEffect' } as any }))).toBe(
			'rpc_handleFileEffect'
		)
	})

	it('classifies a queue message', () => {
		expect(
			classifyHandler(item({ event: { queue: 'tldraw-multiplayer-queue', batchSize: 3 } as any }))
		).toBe('queue')
	})

	it('classifies a fetch', () => {
		expect(
			classifyHandler(item({ event: { request: { method: 'GET', url: 'https://x/y' } } as any }))
		).toBe('fetch')
	})

	it('returns unknown for an event shape it does not recognise', () => {
		expect(classifyHandler(item({ event: {} as any }))).toBe('unknown')
	})
})

describe('field normalisers', () => {
	it('fills in defaults for the optional identity fields', () => {
		const bare = item({ event: null })
		expect({
			scriptName: scriptNameOf(bare),
			entrypoint: entrypointOf(bare),
			scriptVersion: scriptVersionOf(bare),
		}).toEqual({ scriptName: 'unknown', entrypoint: 'default', scriptVersion: 'unknown' })
	})

	it('passes through the real values', () => {
		const full = item({
			scriptName: 'tldraw-multiplayer',
			entrypoint: 'TLFileDurableObject',
			scriptVersion: { id: 'abc-123' },
		})
		expect({
			scriptName: scriptNameOf(full),
			entrypoint: entrypointOf(full),
			scriptVersion: scriptVersionOf(full),
		}).toEqual({
			scriptName: 'tldraw-multiplayer',
			entrypoint: 'TLFileDurableObject',
			scriptVersion: 'abc-123',
		})
	})
})

describe('isErrorOutcome', () => {
	it('partitions the outcome enum exactly as the design specifies', () => {
		const outcomes = [
			'ok',
			'canceled',
			'responseStreamDisconnected',
			'exception',
			'exceededCpu',
			'exceededMemory',
			'scriptNotFound',
			'unknown',
		]
		expect(Object.fromEntries(outcomes.map((o) => [o, isErrorOutcome(o)]))).toEqual({
			ok: false,
			canceled: false,
			responseStreamDisconnected: false,
			exception: true,
			exceededCpu: true,
			exceededMemory: true,
			scriptNotFound: true,
			unknown: true,
		})
	})

	it('treats an outcome it has never seen as an error', () => {
		expect(isErrorOutcome('somethingNewCloudflareAdded')).toBe(true)
	})
})

describe('bucketFlags', () => {
	it('has one flag per bound', () => {
		expect(bucketFlags(0)).toHaveLength(WALL_TIME_BUCKETS_MS.length)
	})

	it('sets every bound at or above the measurement', () => {
		expect(bucketFlags(7)).toEqual([0, 0, 1, 1, 1, 1, 1, 1])
	})

	it('includes the boundary itself', () => {
		expect(bucketFlags(5)).toEqual([0, 1, 1, 1, 1, 1, 1, 1])
	})

	it('sets nothing when the measurement is above the top bound', () => {
		expect(bucketFlags(5000)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
	})
})
