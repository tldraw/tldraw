import {
	createComment,
	createCommentThread,
	TLComment,
	TLPageId,
	TLShape,
	toRichText,
} from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authorizeFileRecord } from './authorizeFileRecord'
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
	const auth = (await object.getRoom()).options.beforeWrite as typeof authorizeFileRecord
	points.length = 0
	return {
		object,
		auth,
		points,
		warnings,
		flush: async () => {
			await Promise.all(pending)
		},
	}
}
const get = () => undefined
const session = {
	sessionId: 'secret-session',
	isReadonly: false,
	meta: { userId: 'alice', storeId: 'secret-store' },
}
const note = (userId: string) =>
	({
		id: 'shape:secret',
		typeName: 'shape',
		type: 'note',
		props: { textLastEditedBy: userId },
	}) as TLShape

function point(type: string, operation: string, shapeType: string, count = 1) {
	return {
		blobs: ['record_vetoed', 'test-worker', type, operation, shapeType],
		indexes: ['durable-object-id'],
		doubles: [count],
	}
}

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('file room record veto telemetry', () => {
	it('indexes every create/update/delete veto by room with bounded record dimensions', async () => {
		vi.useFakeTimers()
		vi.spyOn(authorizeFileRecord, 'shape').mockReturnValueOnce(null).mockReturnValueOnce(null)
		const h = await harness()
		const { auth } = h
		expect(auth.shape({ session, get, type: 'create', prev: null, next: note('bob') })).toBeNull()
		expect(auth.shape({ session, get, type: 'create', prev: null, next: note('bob') })).toBeNull()
		expect(
			auth.shape({ session, get, type: 'update', prev: note('alice'), next: note('bob') })
		).toBeNull()
		const thread = createCommentThread({
			pageId: 'page:test' as TLPageId,
			anchor: { type: 'page' },
			createdBy: 'alice',
		})
		expect(
			auth['comment-thread']!({ session, get, type: 'delete', prev: thread, next: null })
		).toBeNull()
		expect(h.points).toEqual([])
		await h.flush()
		expect(h.points).toEqual([
			point('shape', 'create', 'note', 2),
			point('shape', 'update', 'note'),
			point('comment-thread', 'delete', ''),
		])
		expect(h.warnings).toEqual([
			{
				durableObjectId: 'durable-object-id',
				slug: 'file-id',
				typeName: 'shape',
				operation: 'create',
				shapeType: 'note',
			},
			{ message: 'File record vetoed', level: 'warning' },
		])
	})
	it('batches a thousand vetoes after authorization and resets the queue for the next push', async () => {
		vi.useFakeTimers()
		const h = await harness()
		const { auth } = h
		const waitUntil = vi.spyOn(h.object.state, 'waitUntil')
		for (let i = 0; i < 1000; i++) {
			expect(
				auth.shape({ session, get, type: 'update', prev: note('alice'), next: note('bob') })
			).toBeNull()
		}
		expect(h.points).toEqual([])
		expect(waitUntil).toHaveBeenCalledTimes(1)
		await h.flush()
		expect(h.points).toEqual([point('shape', 'update', 'note', 1000)])
		auth.shape({ session, get, type: 'update', prev: note('alice'), next: note('bob') })
		await h.flush()
		expect(h.points).toHaveLength(2)
		expect(h.points[1]).toEqual(point('shape', 'update', 'note'))
		expect(h.warnings).toHaveLength(2)
	})

	it('preserves allowed creates, updates, and deletes without scheduling telemetry', async () => {
		vi.useFakeTimers()
		const h = await harness()
		const { auth } = h
		const waitUntil = vi.spyOn(h.object.state, 'waitUntil')
		const read = vi.spyOn(h.object.storage, 'get')
		const write = vi.spyOn(h.object.storage, 'put')
		const capture = vi.spyOn(h.object.sentry, 'captureMessage')
		const next = note('alice')
		for (let i = 0; i < 1000; i++) {
			expect(auth.shape({ session, get, type: 'create', prev: null, next })).toBe(next)
			expect(auth.shape({ session, get, type: 'update', prev: next, next })).toBe(next)
			expect(auth.shape({ session, get, type: 'delete', prev: next, next: null })).toBe(next)
		}
		await h.flush()
		expect(h.points).toEqual([])
		expect(waitUntil).not.toHaveBeenCalled()
		expect(read).not.toHaveBeenCalled()
		expect(write).not.toHaveBeenCalled()
		expect(capture).not.toHaveBeenCalled()
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
			const { auth } = h
			auth.shape({ session, get, type: 'update', prev: note('alice'), next: note('bob') })
			await h.flush()
			expect(h.warnings).toHaveLength(expected)
		}
	})
	it('keeps vetoes when analytics, storage, or Sentry fail', async () => {
		vi.useFakeTimers()
		for (const dependency of ['analytics', 'storage', 'sentry']) {
			const h = await harness()
			const { auth } = h
			const fail = () => {
				throw new Error('telemetry unavailable')
			}
			const writeDataPoint = h.object.measure.writeDataPoint
			if (dependency === 'analytics') h.object.measure.writeDataPoint = fail
			if (dependency === 'storage') h.object.storage.put = fail
			if (dependency === 'sentry') h.object.sentry.captureMessage = fail
			expect(
				auth.shape({ session, get, type: 'update', prev: note('alice'), next: note('bob') })
			).toBeNull()
			await expect(h.flush()).resolves.toBeUndefined()
			if (dependency === 'analytics') {
				h.object.measure.writeDataPoint = writeDataPoint
				auth.shape({ session, get, type: 'update', prev: note('alice'), next: note('bob') })
				await h.flush()
				expect(h.points).toEqual([point('shape', 'update', 'note')])
			}
		}
	})

	it('bounds unvalidated shape types without including the client record type name', async () => {
		vi.useFakeTimers()
		vi.spyOn(authorizeFileRecord, 'shape').mockReturnValue(null)
		const h = await harness()
		const { auth } = h
		const next = {
			...note('bob'),
			type: 'secret-client-content',
			typeName: 'secret-type-name',
		} as unknown as TLShape
		expect(auth.shape({ session, get, type: 'create', prev: null, next })).toBeNull()
		expect(h.points).toEqual([])
		await h.flush()
		expect(h.points).toEqual([point('shape', 'create', 'unknown')])
		expect(h.warnings[0]).toEqual({
			durableObjectId: 'durable-object-id',
			slug: 'file-id',
			typeName: 'shape',
			operation: 'create',
			shapeType: 'unknown',
		})
	})

	it('preserves canonicalized results, missing authorizers, and policy exceptions', async () => {
		vi.useFakeTimers()
		const comment = createComment({
			pageId: 'page:test' as TLPageId,
			threadId: 'comment-thread:test' as TLComment['threadId'],
			authorId: 'bob',
			body: toRichText('Hello'),
		})
		vi.spyOn(authorizeFileRecord, 'shape').mockImplementation(() => {
			throw new Error('policy failed')
		})
		const original = authorizeFileRecord['comment-reaction']
		try {
			authorizeFileRecord['comment-reaction'] = undefined
			const h = await harness()
			expect(h.auth['comment-reaction']).toBeUndefined()
			expect(h.auth.comment!({ session, get, type: 'create', prev: null, next: comment })).toEqual({
				...comment,
				authorId: 'alice',
			})
			expect(() =>
				h.auth.shape({ session, get, type: 'create', prev: null, next: note('bob') })
			).toThrow('policy failed')
			await h.flush()
			expect(h.points).toEqual([])
			expect(h.warnings).toEqual([])
		} finally {
			authorizeFileRecord['comment-reaction'] = original
		}
	})
})
