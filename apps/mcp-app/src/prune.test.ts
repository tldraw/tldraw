import { describe, expect, it } from 'vitest'
import { decidePrune } from './prune'

const DAY = 24 * 60 * 60 * 1000
const now = 1_700_000_000_000

describe('decidePrune', () => {
	it('keeps a fresh session', () => {
		expect(
			decidePrune({ lastActivity: now - DAY, checkpointCount: 3 }, now, 7 * DAY, false)
		).toEqual({
			idleMs: DAY,
			action: 'kept',
		})
	})

	it('condemns an idle session', () => {
		expect(
			decidePrune({ lastActivity: now - 8 * DAY, checkpointCount: 3 }, now, 7 * DAY, false)
		).toEqual({
			idleMs: 8 * DAY,
			action: 'destroy-scheduled',
		})
	})

	it('reports would-destroy instead of condemning on dry run', () => {
		expect(
			decidePrune({ lastActivity: now - 8 * DAY, checkpointCount: 3 }, now, 7 * DAY, true)
		).toEqual({
			idleMs: 8 * DAY,
			action: 'would-destroy',
		})
	})

	it('treats a session that was never active as infinitely idle', () => {
		expect(decidePrune({ lastActivity: null, checkpointCount: 0 }, now, 7 * DAY, false)).toEqual({
			idleMs: Infinity,
			action: 'destroy-scheduled',
		})
	})

	it('idle exactly at the threshold counts as idle', () => {
		expect(
			decidePrune({ lastActivity: now - 7 * DAY, checkpointCount: 1 }, now, 7 * DAY, true).action
		).toBe('would-destroy')
	})

	it('maxIdleMs of 0 condemns anything with activity in the past', () => {
		expect(decidePrune({ lastActivity: now - 1, checkpointCount: 1 }, now, 0, false).action).toBe(
			'destroy-scheduled'
		)
	})
})
