import { describe, expect, it, vi } from 'vitest'
import { Environment } from '../types'
import { DataPoint, writeDataPoint } from './analytics'

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
	writeDataPoint(env, 'room', 'enter', data)
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

		it('puts the domain in blob16 and the user in blob17', () => {
			const written = write({ userId: 'user:1' })
			expect(written.blob(16)).toBe('room')
			expect(written.blob(17)).toBe('user:1')
		})

		it('writes an empty user slot rather than a sentinel when there is no user', () => {
			expect(write().blob(17)).toBe('')
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

		it('pads the unused payload range so the header keeps its positions', () => {
			const written = write({ blobs: ['instance-id'] })
			expect(written.blobs).toEqual([
				'enter',
				'production-tldraw-multiplayer',
				'instance-id',
				...Array(12).fill(''),
				'room',
				'',
			])
		})

		it('passes doubles through untouched', () => {
			expect(write({ doubles: [1, 2] }).doubles).toEqual([1, 2])
		})

		it('truncates a payload too wide for its range rather than overflowing the header', () => {
			const written = write({ blobs: Array.from({ length: 20 }, (_, i) => `blob${i}`) })
			expect(written.blob(15)).toBe('blob12')
			expect(written.blob(16)).toBe('room')
			expect(written.blobs).toHaveLength(17)
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
		expect(() => writeDataPoint(env, 'room', 'enter', {})).not.toThrow()
	})

	it('does nothing when the dataset is not bound', () => {
		const env = makeEnv({ MEASURE: undefined })
		expect(() => writeDataPoint(env, 'room', 'enter', {})).not.toThrow()
	})
})
