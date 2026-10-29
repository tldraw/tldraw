import { HistorySession } from '@tldraw/dotcom-shared'
import { describe, expect, it } from 'vitest'
import { groupByAge } from './groupByAge'

const now = new Date('2026-10-29T12:00:00.000Z')
const daysAgo = (d: number, h = 0) =>
	new Date(now.getTime() - d * 86400_000 - h * 3600_000).toISOString()
function session(end: string, extra: Partial<HistorySession> = {}): HistorySession {
	return {
		start: end,
		end,
		authors: [{ userId: 'u1' }],
		added: 1,
		updated: 0,
		removed: 0,
		checkpoints: [],
		points: [],
		...extra,
	}
}

describe('groupByAge', () => {
	it('recent sessions stay individual', () => {
		const rows = groupByAge([session(daysAgo(1)), session(daysAgo(1, 2))], now, 'UTC')
		expect(rows.map((r) => r.level)).toEqual(['session', 'session'])
	})

	it('10 day old sessions group by local day', () => {
		const rows = groupByAge(
			[session(daysAgo(10, 1)), session(daysAgo(10, 3)), session(daysAgo(11))],
			now,
			'UTC'
		)
		expect(rows.map((r) => r.level)).toEqual(['day', 'day'])
		expect(rows[0]).toMatchObject({ key: '2026-10-19', added: 2 })
		expect(rows[0].level === 'day' && rows[0].sessions).toHaveLength(2)
	})

	it('day boundary follows the time zone', () => {
		const end = '2026-10-15T05:00:00.000Z' // 07:00 in Ljubljana, 22:00 the day before in LA
		const lj = groupByAge([session(end)], now, 'Europe/Ljubljana')[0]
		const la = groupByAge([session(end)], now, 'America/Los_Angeles')[0]
		expect(lj).toMatchObject({ level: 'day', key: '2026-10-15' })
		expect(la).toMatchObject({ level: 'day', key: '2026-10-14' })
	})

	it('60 day old sessions group by week', () => {
		// 2026-08-30 is a Sunday, 2026-08-31 a Monday
		const rows = groupByAge(
			[
				session('2026-09-01T10:00:00.000Z'),
				session('2026-08-31T10:00:00.000Z'),
				session('2026-08-30T10:00:00.000Z'),
			],
			now,
			'UTC'
		)
		expect(rows.map((r) => (r.level === 'session' ? r.level : r.key))).toEqual([
			'week:2026-08-31',
			'week:2026-08-24',
		])
	})

	it('named versions never grouped', () => {
		const rows = groupByAge([session(daysAgo(40), { name: 'Before review' })], now, 'UTC')
		expect(rows[0].level).toBe('session')
	})

	it('restore sessions never grouped', () => {
		const rows = groupByAge(
			[session(daysAgo(40), { restore: { restoreId: 'r', restoredFrom: daysAgo(90) } })],
			now,
			'UTC'
		)
		expect(rows[0].level).toBe('session')
	})
})
