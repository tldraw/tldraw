import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment, QueueMessage } from './types'

// The queue consumer's contract with its handlers: one invocation-scoped pool per batch, created
// before the loop with the default short idle timeout, handed to every message, and destroyed
// afterwards no matter how the messages went. The handlers themselves are mocked — their behavior
// is pinned in ogImageQueue.test.ts; this file pins the pool lifecycle around them.

vi.mock('cloudflare:workers', () => ({
	WorkerEntrypoint: class {
		constructor(
			public ctx: unknown,
			public env: unknown
		) {}
	},
	DurableObject: class {},
}))

const pg = vi.hoisted(() => {
	const execute = vi.fn(async () => undefined)
	const db: any = {
		insertInto: () => db,
		values: () => db,
		onConflict: () => db,
		execute,
		destroy: vi.fn(async () => undefined),
	}
	return {
		db,
		execute,
		createPostgresConnectionPool: vi.fn(
			(_env: unknown, _name: string, _opts?: { idleTimeoutMillis?: number }) => db
		),
	}
})

vi.mock('./postgres', async (importOriginal) => ({
	...(await importOriginal<typeof import('./postgres')>()),
	createPostgresConnectionPool: pg.createPostgresConnectionPool,
}))

vi.mock('./routes/tla/ogImageQueue', async (importOriginal) => ({
	...(await importOriginal<typeof import('./routes/tla/ogImageQueue')>()),
	handleOgImageRenderMessage: vi.fn(async () => undefined),
}))

import { handleOgImageRenderMessage } from './routes/tla/ogImageQueue'
import Worker from './worker'

function makeMessage(body: QueueMessage) {
	return { body, attempts: 1, ack: vi.fn(), retry: vi.fn() } as any
}

function makeBatch(...bodies: QueueMessage[]) {
	return { messages: bodies.map(makeMessage) } as any
}

function makeWorker() {
	const ctx = { waitUntil: vi.fn() }
	return { ctx, worker: new (Worker as any)(ctx, {} as Environment) }
}

describe('Worker.queue', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('shares one pool across a mixed batch, hands it to every message, and destroys it', async () => {
		const { ctx, worker } = makeWorker()
		const batch = makeBatch(
			{ type: 'og-image-render', kind: 'shared_file', slug: 'a', reason: 'edit' },
			{ type: 'asset-upload', objectName: 'obj-1', fileId: 'file-1', userId: null },
			{ type: 'og-image-render', kind: 'published', slug: 'b', reason: 'publish' }
		)

		await worker.queue(batch)

		expect(pg.createPostgresConnectionPool).toHaveBeenCalledTimes(1)
		const [, name, opts] = pg.createPostgresConnectionPool.mock.calls[0]!
		expect(name).toBe('sync-worker-queue')
		// No idle-timeout override: reads that land close together share a connect, while during a
		// capture (far longer than the default timeout) the client is reaped so it doesn't pin a
		// Supavisor slot for the whole batch.
		expect(opts).toBeUndefined()

		expect(handleOgImageRenderMessage).toHaveBeenCalledTimes(2)
		for (const call of vi.mocked(handleOgImageRenderMessage).mock.calls) {
			expect(call[2]).toEqual({ ctx, db: pg.db })
		}
		// The asset insert rides the same pool, and its message is settled here in the loop.
		expect(pg.execute).toHaveBeenCalledTimes(1)
		expect(batch.messages[1].ack).toHaveBeenCalledTimes(1)
		expect(pg.db.destroy).toHaveBeenCalledTimes(1)
	})

	it('retries a message whose handler throws without aborting the rest of the batch', async () => {
		vi.mocked(handleOgImageRenderMessage).mockRejectedValueOnce(new Error('unexpected'))
		const { worker } = makeWorker()
		const batch = makeBatch(
			{ type: 'og-image-render', kind: 'shared_file', slug: 'a', reason: 'edit' },
			{ type: 'og-image-render', kind: 'shared_file', slug: 'b', reason: 'edit' }
		)

		await worker.queue(batch)

		expect(batch.messages[0].retry).toHaveBeenCalledTimes(1)
		expect(handleOgImageRenderMessage).toHaveBeenCalledTimes(2)
		expect(pg.db.destroy).toHaveBeenCalledTimes(1)
	})

	// An unknown message type (deploy skew) throws out of the loop mid-batch on purpose, leaving
	// later messages unvisited for the queue to redeliver — but the pool must still be torn down.
	it('destroys the pool even when the loop throws on an unknown message type', async () => {
		const { worker } = makeWorker()
		const batch = makeBatch({ type: 'mystery' } as any)

		await expect(worker.queue(batch)).rejects.toThrow()
		expect(pg.db.destroy).toHaveBeenCalledTimes(1)
	})
})
