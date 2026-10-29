import { describe, expect, it } from 'vitest'
import { VersionIndexRow } from './versionIndexStorage'
import { groupSessions, samplePoints } from './versionSessions'

const base = Date.parse('2026-10-01T00:00:00.000Z')
const at = (min: number) => new Date(base + min * 60_000).toISOString()

function row(min: number, overrides: Partial<VersionIndexRow> = {}): VersionIndexRow {
	return {
		ts: at(min),
		documentClock: min,
		kind: 'edit',
		authors: [{ userId: 'u1' }],
		added: 1,
		updated: 0,
		removed: 0,
		restoreId: null,
		restoredFrom: null,
		restoredFromName: null,
		name: null,
		...overrides,
	}
}
const desc = (rows: VersionIndexRow[]) => [...rows].sort((a, b) => (a.ts < b.ts ? 1 : -1))

describe('groupSessions', () => {
	it('splits on a 31 minute gap, not on 29', () => {
		const { sessions } = groupSessions(desc([row(0), row(29), row(60)]), { exhausted: true })
		expect(sessions.map((s) => [s.start, s.end])).toEqual([
			[at(60), at(60)],
			[at(0), at(29)],
		])
	})

	it('system rows are ignored and do not bridge gaps', () => {
		const { sessions } = groupSessions(
			desc([row(0), row(20, { kind: 'system' }), row(40, { kind: 'system' }), row(45)]),
			{ exhausted: true }
		)
		expect(sessions).toHaveLength(2)
	})

	it('restore row is its own session with restore info', () => {
		const { sessions } = groupSessions(
			desc([
				row(0),
				row(1, { kind: 'pre_restore', restoreId: 'r1' }),
				row(2, { kind: 'restore', restoreId: 'r1', restoredFrom: at(-500) }),
				row(3),
			]),
			{ exhausted: true }
		)
		expect(sessions.map((s) => s.end)).toEqual([at(3), at(2), at(1)])
		expect(sessions[1].restore).toEqual({ restoreId: 'r1', restoredFrom: at(-500) })
		expect(sessions[0].restore).toBeUndefined()
	})

	it('restore from a named version carries the name', () => {
		const { sessions } = groupSessions(
			desc([
				row(0, {
					kind: 'restore',
					restoreId: 'r1',
					restoredFrom: at(-500),
					restoredFromName: 'v3',
				}),
			]),
			{ exhausted: true }
		)
		expect(sessions[0].restore).toEqual({
			restoreId: 'r1',
			restoredFrom: at(-500),
			restoredFromName: 'v3',
		})
	})

	it('a named version is its own session and carries its name', () => {
		const { sessions } = groupSessions(desc([row(0), row(1, { name: 'Before review' }), row(2)]), {
			exhausted: true,
		})
		expect(sessions.map((s) => [s.end, s.name])).toEqual([
			[at(2), undefined],
			[at(1), 'Before review'],
			[at(0), undefined],
		])
	})

	it('pre_restore closes the session', () => {
		const { sessions } = groupSessions(
			desc([row(0), row(1, { kind: 'pre_restore', restoreId: 'r1' }), row(2)]),
			{ exhausted: true }
		)
		expect(sessions.map((s) => [s.start, s.end])).toEqual([
			[at(2), at(2)],
			[at(0), at(1)],
		])
	})

	it('3h session has 2 hourly checkpoints', () => {
		const rows = Array.from({ length: 19 }, (_, i) => row(i * 10)) // 0..180 min
		const { sessions } = groupSessions(desc(rows), { exhausted: true })
		expect(sessions).toHaveLength(1)
		expect(sessions[0].checkpoints.map((c) => c.ts)).toEqual([at(120), at(60)])
	})

	it('authors deduped across rows', () => {
		const { sessions } = groupSessions(
			desc([
				row(0, { authors: [{ userId: 'u1' }] }),
				row(1, { authors: [{ userId: 'u1' }, { userId: 'u2', agent: 'mcp' }] }),
			]),
			{ exhausted: true }
		)
		expect(sessions[0].authors).toEqual([{ userId: 'u1' }, { userId: 'u2', agent: 'mcp' }])
	})

	it('counts summed', () => {
		const { sessions } = groupSessions(desc([row(0, { removed: 2 }), row(1, { updated: 3 })]), {
			exhausted: true,
		})
		expect(sessions[0]).toMatchObject({ added: 2, updated: 3, removed: 2 })
	})

	it('oldest session marked incomplete when the input may be cut', () => {
		expect(groupSessions(desc([row(0), row(1)]), { exhausted: false }).lastIsComplete).toBe(false)
		expect(groupSessions(desc([row(0), row(1)]), { exhausted: true }).lastIsComplete).toBe(true)
	})
})

describe('session points', () => {
	it('is zero when every save falls in the last 5 minute window', () => {
		const { sessions } = groupSessions(desc([row(10), row(11), row(12)]), { exhausted: true })
		expect(sessions[0].points).toEqual([])
	})
	it('counts the 5 minute windows before the last one', () => {
		const { sessions } = groupSessions(desc([row(0), row(2), row(6), row(12)]), { exhausted: true })
		expect(sessions[0].points.map((p) => p.ts)).toEqual([at(6), at(2)])
	})
})

describe('samplePoints', () => {
	it('keeps last per 5 minute window', () => {
		const points = samplePoints([row(0), row(2), row(4), row(5), row(9), row(11)])
		expect(points.map((p) => p.ts)).toEqual([at(11), at(9), at(4)])
		expect(points[2].added).toBe(3)
	})
})
