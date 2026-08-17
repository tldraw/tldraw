import { describe, expect, it } from 'vitest'
import { AggInput, Aggregator } from './aggregate'

function input(partial: Partial<AggInput> = {}): AggInput {
	return {
		scriptName: 'tldraw-multiplayer',
		entrypoint: 'TLFileDurableObject',
		handler: 'ws_message',
		outcome: 'ok',
		scriptVersion: 'v1',
		wallTime: 7,
		cpuTime: 2,
		...partial,
	}
}

describe('Aggregator', () => {
	it('folds identical keys into one bucket', () => {
		const aggregator = new Aggregator()
		aggregator.add(input({ wallTime: 7, cpuTime: 2 }))
		aggregator.add(input({ wallTime: 30, cpuTime: 5 }))

		expect(aggregator.drain(0)).toEqual([
			{
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
				// 7ms sets every bound from 10 up; 30ms sets every bound from 50 up.
				le: [0, 0, 1, 1, 2, 2, 2, 2],
			},
		])
	})

	it('keeps separate buckets per key field', () => {
		const aggregator = new Aggregator()
		aggregator.add(input({ handler: 'ws_message' }))
		aggregator.add(input({ handler: 'ws_close' }))
		aggregator.add(input({ outcome: 'exception' }))
		aggregator.add(input({ entrypoint: 'default' }))
		aggregator.add(input({ scriptName: 'main-tldraw-multiplayer' }))
		// The sixth case is the only one that pins scriptVersion: the five above already differ from
		// each other in another field, so dropping scriptVersion from the key would still yield five
		// buckets. This one collides with the default input unless scriptVersion is part of the key.
		aggregator.add(input({ scriptVersion: 'v2' }))

		expect(aggregator.drain(0)).toHaveLength(6)
	})

	it('is empty after draining', () => {
		const aggregator = new Aggregator()
		aggregator.add(input())
		aggregator.drain(0)

		expect(aggregator.drain(0)).toEqual([])
	})

	it('flushes every batch at the shipped thresholds', () => {
		const aggregator = new Aggregator()
		aggregator.add(input())

		expect(aggregator.shouldFlush(0)).toBe(true)
	})
})
