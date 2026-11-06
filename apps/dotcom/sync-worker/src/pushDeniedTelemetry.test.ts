import { filePermissions } from '@tldraw/dotcom-shared'
import type { TLPushDeniedInfo } from '@tldraw/sync-core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TLFileDurableObject } from './TLFileDurableObject'

vi.mock('cloudflare:workers', () => ({ DurableObject: class {} }))
vi.mock('@tldraw/sync-core', async (original) => ({
	...(await original<typeof import('@tldraw/sync-core')>()),
	TLSocketRoom: class {
		constructor(readonly options: any) {}
	},
}))

async function harness(saved = new Map<string, unknown>()) {
	const pending: Promise<unknown>[] = []
	const points: unknown[] = []
	const warnings: unknown[] = []
	const object = Object.assign(Object.create(TLFileDurableObject.prototype), {
		_documentInfo: { slug: 'file-id' },
		id: { toString: () => 'durable-object-id' },
		env: { WORKER_NAME: 'test-worker' },
		measure: { writeDataPoint: (point: unknown) => points.push(point) },
		state: {
			getWebSockets: () => [],
			waitUntil: (promise: Promise<unknown>) => pending.push(promise),
		},
		storage: {
			get: async (key: string) => saved.get(key),
			put: async (key: string, value: unknown) => {
				saved.set(key, value)
			},
		},
		sentry: {
			withScope: (fn: any) =>
				fn({ setExtras: (extras: unknown) => warnings.push(extras), setFingerprint: vi.fn() }),
			captureMessage: (message: string, level: string) => warnings.push({ message, level }),
		},
		getStorage: async () => ({}),
		maybeAssociateFileAssets: vi.fn(),
	})
	const options = (await object.getRoom()).options
	points.length = 0
	return {
		object,
		options,
		deny: (reason: string) => options.onPushDenied(denial(reason)),
		points,
		warnings,
		flush: async () => {
			await Promise.all(pending)
		},
	}
}

function denial(reason: string): TLPushDeniedInfo<unknown> {
	return {
		sessionId: 'secret-session',
		meta: { userId: 'alice', storeId: 'secret-store' },
		access: { userId: 'alice', abilities: ['edit', 'comment'] },
		reason,
		intent: { name: 'secret-client-intent' },
	}
}

function point(reason: string, count = 1) {
	return {
		blobs: ['push_denied', 'test-worker', reason],
		indexes: ['durable-object-id'],
		doubles: [count],
	}
}

const NOTE = 'You can only attribute note text to yourself.'
const THREAD = 'Threads are deleted with their isDeleted flag, not removed.'

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('file room push denial telemetry', () => {
	it('gives the room the shared file permissions', async () => {
		const h = await harness()
		expect(h.options.permissions).toBe(filePermissions)
	})

	it('indexes denials by room and reason, without session or intent details', async () => {
		vi.useFakeTimers()
		const h = await harness()
		h.deny(NOTE)
		h.deny(NOTE)
		h.deny(THREAD)
		expect(h.points).toEqual([])
		await h.flush()
		expect(h.points).toEqual([point(NOTE, 2), point(THREAD)])
		expect(h.warnings).toEqual([
			{ durableObjectId: 'durable-object-id', slug: 'file-id', reason: NOTE },
			{ message: 'File push denied', level: 'warning' },
		])
	})

	it('batches a thousand denials and resets the queue for the next push', async () => {
		vi.useFakeTimers()
		const h = await harness()
		const waitUntil = vi.spyOn(h.object.state, 'waitUntil')
		for (let i = 0; i < 1000; i++) h.deny(NOTE)
		expect(h.points).toEqual([])
		expect(waitUntil).toHaveBeenCalledTimes(1)
		await h.flush()
		expect(h.points).toEqual([point(NOTE, 1000)])
		h.deny(NOTE)
		await h.flush()
		expect(h.points).toHaveLength(2)
		expect(h.points[1]).toEqual(point(NOTE))
		expect(h.warnings).toHaveLength(2)
	})

	it('retains the warning cooldown across hibernation and permits a later boot warning', async () => {
		vi.useFakeTimers()
		const saved = new Map<string, unknown>()
		for (const [minutes, expected] of [
			[0, 2],
			[5, 0],
			[61, 2],
		]) {
			vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + minutes * 60_000)
			const h = await harness(saved)
			h.deny(NOTE)
			await h.flush()
			expect(h.warnings).toHaveLength(expected)
		}
	})

	it('survives analytics, storage, or Sentry failures', async () => {
		vi.useFakeTimers()
		for (const dependency of ['analytics', 'storage', 'sentry']) {
			const h = await harness()
			const fail = () => {
				throw new Error('telemetry unavailable')
			}
			const writeDataPoint = h.object.measure.writeDataPoint
			if (dependency === 'analytics') h.object.measure.writeDataPoint = fail
			if (dependency === 'storage') h.object.storage.put = fail
			if (dependency === 'sentry') h.object.sentry.captureMessage = fail
			h.deny(NOTE)
			await expect(h.flush()).resolves.toBeUndefined()
			if (dependency === 'analytics') {
				h.object.measure.writeDataPoint = writeDataPoint
				h.deny(NOTE)
				await h.flush()
				expect(h.points).toEqual([point(NOTE)])
			}
		}
	})

	it('never throws out of onPushDenied', async () => {
		const h = await harness()
		h.object.state.waitUntil = () => {
			throw new Error('telemetry unavailable')
		}
		expect(() => h.deny(NOTE)).not.toThrow()
	})
})
