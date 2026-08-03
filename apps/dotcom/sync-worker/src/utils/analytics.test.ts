import { describe, expect, it, vi } from 'vitest'
import { Environment } from '../types'
import { DataPoint, EVENT_DOMAINS, writeDataPoint } from './analytics'

function makeEnv(overrides: Partial<Environment> = {}) {
	return {
		MEASURE: { writeDataPoint: vi.fn() },
		WORKER_NAME: 'production-tldraw-multiplayer',
		...overrides,
	} as unknown as Environment
}

/** The single datapoint an env was written to, with blobs addressed by their 1-based blob number. */
function writtenTo(env: Environment) {
	const calls = (env.MEASURE as any).writeDataPoint.mock.calls
	expect(calls).toHaveLength(1)
	const [datapoint] = calls[0]
	return {
		...datapoint,
		blob: (n: number) => datapoint.blobs[n - 1],
	}
}

function write(data: DataPoint = {}, env = makeEnv()) {
	writeDataPoint(env, 'enter', data)
	return writtenTo(env)
}

describe('writeDataPoint', () => {
	describe('the header', () => {
		it('puts the event in blob1 and the worker name in blob2', () => {
			const written = write()
			expect(written.blob(1)).toBe('enter')
			expect(written.blob(2)).toBe('production-tldraw-multiplayer')
		})

		it('falls back to the development worker name', () => {
			const written = write({}, makeEnv({ WORKER_NAME: undefined }))
			expect(written.blob(2)).toBe('development-tldraw-multiplayer')
		})

		it('writes the subject to index1', () => {
			expect(write({ subject: 'room-do-id' }).indexes).toEqual(['room-do-id'])
		})

		it('omits the index entirely when there is no subject, so it reads as not object-scoped', () => {
			expect(write().indexes).toBeUndefined()
		})
	})

	describe('the domain-owned payload', () => {
		it('starts at blob3, in the order the domain writer chose', () => {
			const written = write({ blobs: ['instance-id', 'second'] })
			expect(written.blob(3)).toBe('instance-id')
			expect(written.blob(4)).toBe('second')
		})

		it('writes nothing beyond the payload, so no row carries empty padding', () => {
			expect(write({ blobs: ['instance-id'] }).blobs).toEqual([
				'enter',
				'production-tldraw-multiplayer',
				'instance-id',
			])
		})

		it('passes doubles through untouched', () => {
			expect(write({ doubles: [1, 2] }).doubles).toEqual([1, 2])
		})

		// blob16..blob20 are held for header fields a later change may want, so a payload must not
		// grow into them.
		it('truncates a payload at blob15 rather than running into the reserved range', () => {
			const written = write({ blobs: Array.from({ length: 20 }, (_, i) => `b${i}`) })
			expect(written.blob(15)).toBe('b12')
			expect(written.blobs).toHaveLength(15)
		})
	})

	it('swallows write failures, so losing a datapoint cannot break its request', () => {
		const env = makeEnv({
			MEASURE: {
				writeDataPoint: vi.fn(() => {
					throw new Error('nope')
				}),
			},
		} as unknown as Partial<Environment>)
		expect(() => writeDataPoint(env, 'enter', {})).not.toThrow()
	})

	it('does nothing when the dataset is not bound', () => {
		const env = makeEnv({ MEASURE: undefined })
		expect(() => writeDataPoint(env, 'enter', {})).not.toThrow()
	})
})

describe('EVENT_DOMAINS', () => {
	// The dataset carries no domain column, so this map is the only thing that says which payload
	// layout an event's blob3 follows. Exhaustiveness is enforced by its Record type; this pins the
	// grouping itself, which is what a dashboard filtering by domain depends on.
	it('groups every event by the writer that owns its payload', () => {
		const byDomain: Record<string, string[]> = {}
		for (const [event, domain] of Object.entries(EVENT_DOMAINS)) {
			;(byDomain[domain] ??= []).push(event)
		}
		expect(Object.keys(byDomain).sort()).toEqual([
			'postgres',
			'queue',
			'replicator',
			'room',
			'screenshot',
			'user',
		])
		expect(byDomain.postgres.sort()).toEqual([
			'postgres_client_connect',
			'postgres_client_end',
			'postgres_client_error',
		])
		expect(byDomain.queue).toEqual(['queue_message'])
		expect(byDomain.replicator).toEqual(['replicator'])
		expect(byDomain.screenshot).toEqual(['mcp_shared_board_screenshot'])
		expect(byDomain.user).toEqual(['user_durable_object'])
		expect(byDomain.room).toHaveLength(35)
	})
})
