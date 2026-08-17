import { describe, expect, it, vi } from 'vitest'
import { AggBucket } from './aggregate'
import { ErrRow, toErrRow, writeAggRow, writeErrRow } from './analytics'

function dataset() {
	return { writeDataPoint: vi.fn() }
}

const bucket: AggBucket = {
	scriptName: 'tldraw-multiplayer',
	entrypoint: 'TLFileDurableObject',
	handler: 'ws_message',
	outcome: 'ok',
	scriptVersion: 'v1',
	count: 2,
	sumWall: 37,
	maxWall: 30,
	sumCpu: 7,
	maxCpu: 5,
	le: [0, 0, 1, 1, 2, 2, 2, 2],
}

const errRow: ErrRow = {
	scriptName: 'tldraw-multiplayer',
	entrypoint: 'TLFileDurableObject',
	handler: 'alarm',
	outcome: 'exception',
	errorName: 'TypeError',
	message: 'x is not a function',
	scriptVersion: 'v1',
	durableObjectId: 'a'.repeat(64),
	wallTime: 12,
	cpuTime: 3,
	exceptionCount: 1,
}

describe('writeAggRow', () => {
	it('writes the agg row layout', () => {
		const ds = dataset()
		writeAggRow(ds as any, bucket)

		expect(ds.writeDataPoint).toHaveBeenCalledWith({
			blobs: ['agg', 'tldraw-multiplayer', 'TLFileDurableObject', 'ws_message', 'ok', 'v1'],
			doubles: [2, 37, 30, 7, 5, 0, 0, 1, 1, 2, 2, 2, 2],
		})
	})

	it('stays inside the 20-double limit', () => {
		const ds = dataset()
		writeAggRow(ds as any, bucket)

		expect(ds.writeDataPoint.mock.calls[0][0].doubles.length).toBeLessThanOrEqual(20)
	})

	it('does nothing when the binding is missing', () => {
		expect(() => writeAggRow(undefined, bucket)).not.toThrow()
	})
})

describe('writeErrRow', () => {
	it('writes the err row layout, indexed on the durable object id', () => {
		const ds = dataset()
		writeErrRow(ds as any, errRow)

		expect(ds.writeDataPoint).toHaveBeenCalledWith({
			indexes: ['a'.repeat(64)],
			blobs: [
				'err',
				'tldraw-multiplayer',
				'TLFileDurableObject',
				'alarm',
				'exception',
				'TypeError',
				'x is not a function',
				'v1',
			],
			doubles: [12, 3, 1],
		})
	})

	it('clips a long message so the blob budget cannot be blown', () => {
		const ds = dataset()
		writeErrRow(ds as any, { ...errRow, message: 'x'.repeat(5000) })

		expect(ds.writeDataPoint.mock.calls[0][0].blobs[6]).toHaveLength(1024)
	})

	it('clips the index to the 96-byte limit', () => {
		const ds = dataset()
		writeErrRow(ds as any, { ...errRow, durableObjectId: 'b'.repeat(200) })

		expect(ds.writeDataPoint.mock.calls[0][0].indexes[0]).toHaveLength(96)
	})

	it('swallows a write failure rather than failing the invocation', () => {
		const ds = {
			writeDataPoint: vi.fn(() => {
				throw new Error('nope')
			}),
		}
		expect(() => writeErrRow(ds as any, errRow)).not.toThrow()
	})
})

describe('toErrRow', () => {
	it('takes the first exception and counts the rest', () => {
		const item = {
			scriptName: 'tldraw-multiplayer',
			entrypoint: 'TLFileDurableObject',
			outcome: 'exception',
			scriptVersion: { id: 'v1' },
			durableObjectId: 'abc',
			wallTime: 12,
			cpuTime: 3,
			exceptions: [
				{ name: 'TypeError', message: 'x is not a function', timestamp: 0 },
				{ name: 'Error', message: 'secondary', timestamp: 1 },
			],
		} as unknown as TraceItem

		expect(toErrRow(item, 'alarm')).toEqual({
			scriptName: 'tldraw-multiplayer',
			entrypoint: 'TLFileDurableObject',
			handler: 'alarm',
			outcome: 'exception',
			errorName: 'TypeError',
			message: 'x is not a function',
			scriptVersion: 'v1',
			durableObjectId: 'abc',
			wallTime: 12,
			cpuTime: 3,
			exceptionCount: 2,
		})
	})

	it('fills in blanks for an outcome with no exception attached', () => {
		const item = {
			scriptName: 'tldraw-multiplayer',
			outcome: 'exceededCpu',
			wallTime: 30000,
			cpuTime: 30000,
			exceptions: [],
		} as unknown as TraceItem

		expect(toErrRow(item, 'fetch')).toEqual({
			scriptName: 'tldraw-multiplayer',
			entrypoint: 'default',
			handler: 'fetch',
			outcome: 'exceededCpu',
			errorName: 'none',
			message: '',
			scriptVersion: 'unknown',
			durableObjectId: '',
			wallTime: 30000,
			cpuTime: 30000,
			exceptionCount: 0,
		})
	})
})
