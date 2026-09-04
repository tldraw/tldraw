import { createServer, type Socket } from 'node:net'
import { once } from 'node:events'
import * as pg from 'pg'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Logger } from './Logger'
import { TLPostgresPool } from './postgres'
import { submitFeedback } from './routes/submitFeedback'
import { handleOgImageRenderMessage } from './routes/tla/ogImageQueue'
import Worker from './worker'

vi.mock('cloudflare:workers', () => ({ WorkerEntrypoint: class {}, DurableObject: class {} }))
vi.mock('./utils/tla/getAuth', async (original) => ({
	...(await original<any>()),
	requireAuth: vi.fn(async () => ({ userId: 'user-one' })),
}))
vi.mock('./utils/rateLimit', () => ({ isRateLimited: vi.fn(async () => false) }))
vi.mock('./routes/tla/ogImageQueue', async (original) => ({
	...(await original<any>()),
	handleOgImageRenderMessage: vi.fn(async (_env, message) => message.ack()),
}))

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
	vi.clearAllMocks()
})

function env(overrides = {}) {
	return {
		BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: 'postgres://user:password@localhost/test',
		TLDRAW_ENV: 'production',
		DISCORD_FEEDBACK_WEBHOOK_URL: 'https://example.invalid/feedback',
		...overrides,
	} as any
}

function mockPg() {
	const connect = vi.spyOn(pg.Client.prototype, 'connect').mockImplementation(function (cb?: any): any {
		if (cb) return queueMicrotask(() => cb(null))
		return Promise.resolve()
	})
	const query = vi.spyOn(pg.Client.prototype, 'query').mockImplementation(async () => ({
		command: 'SELECT', rows: [{ email: 'user@example.invalid' }], rowCount: 1,
	}) as any)
	const end = vi.spyOn(pg.Client.prototype, 'end').mockImplementation(function (this: pg.Client, cb?: any): any {
		this.emit('end')
		if (cb) cb()
		return Promise.resolve()
	})
	const poolEnd = vi.spyOn(pg.Pool.prototype, 'end')
	vi.spyOn(console, 'error').mockImplementation(() => {})
	return { connect, query, end, poolEnd }
}

function message(type: string, attempts = 1) {
	return { body: { type, objectName: 'asset-one', fileId: 'file-one', userId: 'user-one' }, attempts, ack: vi.fn(), retry: vi.fn() }
}

function queue(messages: any[], environment = env()) {
	return Worker.prototype.queue.call({ env: environment, ctx: {} } as any, { messages } as any)
}

function feedback(allowContact = true) {
	return submitFeedback(new Request('https://example.invalid/app/submit-feedback', {
		method: 'POST', body: JSON.stringify({ description: 'test feedback', allowContact, url: '' }),
	}) as any, env())
}

describe('PR 10306 pool ownership', () => {
	it('closes the actual Kysely/pg pool before sending feedback', async () => {
		const { poolEnd, end } = mockPg()
		const fetch = vi.fn(async () => {
			expect(poolEnd).toHaveBeenCalledTimes(1)
			expect(end).toHaveBeenCalledTimes(1)
			return new Response('ok')
		})
		vi.stubGlobal('fetch', fetch)
		expect((await feedback()).status).toBe(200)
		expect(fetch).toHaveBeenCalledTimes(1)
	})

	it.each(['query error', 'missing user'])('closes the feedback pool on %s', async (failure) => {
		const { query, poolEnd, end } = mockPg()
		if (failure === 'query error') query.mockRejectedValueOnce(new Error('query failed'))
		else query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any)
		const fetch = vi.fn()
		vi.stubGlobal('fetch', fetch)
		await expect(feedback()).rejects.toThrow()
		expect(poolEnd).toHaveBeenCalledTimes(1)
		expect(end).toHaveBeenCalledTimes(1)
		expect(fetch).not.toHaveBeenCalled()
	})

	it('does not acquire a database connection for anonymous feedback', async () => {
		const { connect, poolEnd } = mockPg()
		vi.stubGlobal('fetch', vi.fn(async () => new Response('ok')))
		expect((await feedback(false)).status).toBe(200)
		expect(connect).not.toHaveBeenCalled()
		expect(poolEnd).not.toHaveBeenCalled()
	})

	it('uses one pool across a mixed batch, preserves retries and closes it', async () => {
		const { query, connect, poolEnd, end } = mockPg()
		query.mockRejectedValueOnce(new Error('query failed'))
		const failed = message('asset-upload', 3)
		const og = message('og-image-render')
		const succeeded = message('asset-upload')
		await queue([failed, og, succeeded])
		expect(failed.ack).not.toHaveBeenCalled()
		expect(failed.retry).toHaveBeenCalledExactlyOnceWith({ delaySeconds: 8 })
		expect(og.ack).toHaveBeenCalledTimes(1)
		expect(succeeded.ack).toHaveBeenCalledTimes(1)
		expect(succeeded.retry).not.toHaveBeenCalled()
		expect(connect).toHaveBeenCalledTimes(1)
		expect(poolEnd).toHaveBeenCalledTimes(1)
		expect(end).toHaveBeenCalledTimes(1)
	})

	it('retries failed acquisition and processes the next asset before cleanup', async () => {
		const { connect, poolEnd } = mockPg()
		connect.mockImplementationOnce((cb?: any): any => queueMicrotask(() => cb(new Error('connect failed'))))
		const failed = message('asset-upload')
		const next = message('asset-upload')
		await queue([failed, next])
		expect(failed.retry).toHaveBeenCalledTimes(1)
		expect(next.ack).toHaveBeenCalledTimes(1)
		expect(connect).toHaveBeenCalledTimes(2)
		expect(poolEnd).toHaveBeenCalledTimes(1)
	})

	it('closes the pool when an unknown message aborts the batch', async () => {
		const { poolEnd, end } = mockPg()
		const asset = message('asset-upload')
		await expect(queue([asset, message('new-type')])).rejects.toThrow()
		expect(asset.ack).toHaveBeenCalledTimes(1)
		expect(poolEnd).toHaveBeenCalledTimes(1)
		expect(end).toHaveBeenCalledTimes(1)
	})

	it('does not open a pool for OG-only batches, even when a renderer throws', async () => {
		const { connect, poolEnd } = mockPg()
		vi.mocked(handleOgImageRenderMessage).mockRejectedValueOnce(new Error('render failed'))
		const failed = message('og-image-render')
		const next = message('og-image-render')
		await queue([failed, next])
		expect(failed.retry).toHaveBeenCalledTimes(1)
		expect(next.ack).toHaveBeenCalledTimes(1)
		expect(connect).not.toHaveBeenCalled()
		expect(poolEnd).not.toHaveBeenCalled()
	})
})

describe('PR 10306 dial deadline and logger rejection', () => {
	it('rejects a real stalled pg handshake, then admits the queued checkout and teardown', async () => {
		const sockets = new Set<Socket>()
		let accepted = 0
		const server = createServer((socket) => {
			sockets.add(socket)
			socket.on('close', () => sockets.delete(socket))
			if (++accepted === 1) return
			// The first peer stalls; the next completes the PostgreSQL startup handshake.
			socket.once('data', () => socket.write(Buffer.from('5200000008000000005a0000000549', 'hex')))
		})
		server.listen(0, '127.0.0.1')
		await once(server, 'listening')
		const port = (server.address() as any).port
		const environment = env({ BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: `postgres://u:p@127.0.0.1:${port}/db?sslmode=disable` })
		const pool = new TLPostgresPool(environment, new Logger(environment, 'review'))
		try {
			const started = Date.now()
			const first = pool.connect().catch((error) => error)
			const second = pool.connect()
			const teardown = pool.end()
			expect(await first).toBeInstanceOf(Error)
			expect(Date.now() - started).toBeGreaterThanOrEqual(9900)
			expect(Date.now() - started).toBeLessThan(14000)
			const client = await second
			expect(accepted).toBe(2)
			client.release()
			await teardown
		} finally {
			for (const socket of sockets) socket.destroy()
			await new Promise<void>((resolve) => server.close(() => resolve()))
		}
	}, 20000)

	it('contains a rejected debug RPC and allows a later log to be delivered', async () => {
		const debug = vi.fn().mockRejectedValueOnce(new Error('RPC failed')).mockResolvedValue(undefined)
		const logger = new Logger(env({ TLDRAW_ENV: 'preview', TL_LOGGER: { idFromName: () => 'logger', get: () => ({ debug }) } }), 'review')
		const unhandled = vi.fn()
		process.on('unhandledRejection', unhandled)
		try {
			logger.debug('first')
			await new Promise((resolve) => setImmediate(resolve))
			logger.debug('second')
			await new Promise((resolve) => setImmediate(resolve))
			expect(unhandled).not.toHaveBeenCalled()
			expect(debug).toHaveBeenCalledTimes(2)
			expect(debug.mock.calls[1][0][0]).toContain('second')
		} finally {
			process.off('unhandledRejection', unhandled)
		}
	})
})
