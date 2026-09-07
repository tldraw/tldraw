import { IRequest } from 'itty-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../types'
import { getMonthPrefix, getPreviousMonth, getRoomHistory } from './getRoomHistory'

vi.mock('../utils/tla/getAuth', () => ({ requireAdminAccessToRequest: vi.fn() }))

describe('getMonthPrefix', () => {
	it('uses the UTC month at a local month boundary', () => {
		expect(getMonthPrefix(new Date('2026-03-01T00:30:00+02:00'))).toBe('2026-02')
	})
})

describe('getPreviousMonth', () => {
	it.each([
		['2026-03-29T12:00:00Z', '2026-02-01T00:00:00.000Z'],
		['2026-03-30T12:00:00Z', '2026-02-01T00:00:00.000Z'],
		['2026-03-31T12:00:00Z', '2026-02-01T00:00:00.000Z'],
		['2024-03-31T12:00:00Z', '2024-02-01T00:00:00.000Z'],
		['2026-01-31T12:00:00Z', '2025-12-01T00:00:00.000Z'],
		['2026-03-01T00:30:00+02:00', '2026-01-01T00:00:00.000Z'],
	])('steps from %s to %s without changing the input', (input, expected) => {
		const date = new Date(input)
		const originalTime = date.getTime()
		expect(getPreviousMonth(date).toISOString()).toBe(expected)
		expect(date.getTime()).toBe(originalTime)
	})
})

async function listHistory(timestamps: string[], offset: string) {
	const list = vi.fn(async ({ prefix }: { prefix: string }) => ({
		objects: timestamps
			.map((timestamp) => ({ key: `app_rooms/board/${timestamp}` }))
			.filter(({ key }) => key.startsWith(prefix)),
		truncated: false,
	}))
	const response = await getRoomHistory(
		{ params: { roomId: 'board' }, query: { offset } } as unknown as IRequest,
		{ ROOMS_HISTORY_EPHEMERAL: { list } } as unknown as Environment,
		true
	)
	expect(response.status).toBe(200)
	return response.json()
}

describe('getRoomHistory', () => {
	afterEach(() => vi.useRealTimers())

	it('collects consecutive months once and excludes the pagination offset', async () => {
		const timestamps = [
			'2026-03-31T12:00:00.000Z',
			'2026-03-30T10:00:00.000Z',
			'2026-02-28T10:00:00.000Z',
		]
		await expect(listHistory(timestamps, timestamps[0])).resolves.toEqual({
			timestamps: timestamps.slice(1),
			hasMore: false,
		})
	})
	it.each(['!', 'not-a-date'])(
		'uses now for scanning and filtering invalid offset %s',
		async (offset) => {
			vi.useFakeTimers()
			vi.setSystemTime(new Date('2026-03-31T12:00:00Z'))
			const timestamps = [
				'2026-03-31T13:00:00.000Z',
				'2026-03-30T10:00:00.000Z',
				'2026-02-28T10:00:00.000Z',
			]
			await expect(listHistory(timestamps, offset)).resolves.toEqual({
				timestamps: timestamps.slice(1),
				hasMore: false,
			})
		}
	)
})
