import { Kysely } from 'kysely'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Logger } from './Logger'
import { TLPostgresPool, withPostgres } from './postgres'
import { Environment } from './types'

// TLPostgresPool news up a pg.Client directly, so the only seam for the teardown test is the module
// itself. Everything else on pg (types.setTypeParser, Pool) has to stay real: postgres.ts calls it at
// import time, and the withPostgres tests below run against the genuine pool.
const { stubClient } = vi.hoisted(() => ({
	stubClient: { create: null as null | (() => unknown) },
}))
vi.mock('pg', async (importOriginal) => {
	const actual = await importOriginal<typeof import('pg')>()
	class StubbableClient extends actual.Client {
		constructor(...args: ConstructorParameters<typeof actual.Client>) {
			super(...args)
			if (stubClient.create) return stubClient.create() as StubbableClient
		}
	}
	return { ...actual, Client: StubbableClient }
})

// The borrow-or-own contract, pinned against the real implementation rather than a fake: a supplied
// pool is used as-is and its lifetime left to its owner; without one, a pool is created for the call
// and destroyed afterwards, error or not. The reader tests (getSharedFile.test.ts,
// getPublishedFile.test.ts) fake this seam and lean on these to hold.
//
// No connection is ever opened here: pg.Pool connects lazily on the first query, and these
// callbacks never query — which is also why a made-up connection string is fine.
const env = {
	BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: 'postgres://test:test@localhost:5432/test',
} as Environment

describe('withPostgres', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('runs the callback against a supplied db and leaves its lifetime alone', async () => {
		const destroySpy = vi.spyOn(Kysely.prototype, 'destroy')
		const db = { destroy: vi.fn() } as any
		const seen: unknown[] = []

		await expect(
			withPostgres(env, 'test', db, async (given) => {
				seen.push(given)
				return 'result'
			})
		).resolves.toBe('result')
		expect(seen).toEqual([db])
		expect(db.destroy).not.toHaveBeenCalled()
		expect(destroySpy).not.toHaveBeenCalled()
	})

	it('creates its own pool when none is supplied, and destroys it afterwards', async () => {
		const destroySpy = vi.spyOn(Kysely.prototype, 'destroy')
		let captured: unknown

		await withPostgres(env, 'test', undefined, async (db) => {
			captured = db
		})

		expect(captured).toBeInstanceOf(Kysely)
		expect(destroySpy).toHaveBeenCalledTimes(1)
		expect(destroySpy.mock.instances[0]).toBe(captured)
	})

	it('destroys its own pool when the callback throws', async () => {
		const destroySpy = vi.spyOn(Kysely.prototype, 'destroy')
		let captured: unknown

		await expect(
			withPostgres(env, 'test', undefined, async (db) => {
				captured = db
				throw new Error('query failed')
			})
		).rejects.toThrow('query failed')

		expect(destroySpy).toHaveBeenCalledTimes(1)
		expect(destroySpy.mock.instances[0]).toBe(captured)
	})
})

describe('TLPostgresPool', () => {
	afterEach(() => {
		stubClient.create = null
		vi.restoreAllMocks()
	})

	// Destroying the socket while pg's graceful terminate is still in flight cancels the stream out
	// from under it. workerd reports that as a socket error carrying no `code`, and pg only suppresses
	// ECONNRESET/EPIPE while ending, so it reaches the client's 'error' event — one phantom
	// postgres_client_error per release, which is what buried real connection errors in MEASURE.
	it('does not destroy the socket until the graceful terminate has settled', async () => {
		const order: string[] = []
		let settleEnd: () => void = () => {}
		const fakeClient = {
			on: () => {},
			connect: async () => {},
			query: () => {},
			end: () =>
				new Promise<void>((resolve) => {
					settleEnd = () => {
						order.push('end settled')
						resolve()
					}
				}),
			connection: { stream: { destroy: () => order.push('stream destroyed') } },
		}
		stubClient.create = () => fakeClient

		const pool = new TLPostgresPool({} as Environment, {} as Logger)
		const client = await pool.connect()
		client.release()

		expect(order).toEqual([])

		settleEnd()
		await vi.waitFor(() => expect(order).toEqual(['end settled', 'stream destroyed']))
	})
})
