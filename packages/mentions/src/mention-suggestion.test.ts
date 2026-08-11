import { describe, expect, it } from 'vitest'
import { filterMentionMembers } from './mention-suggestion'

const members = [
	{ id: 'u1', name: 'Ada Lovelace' },
	{ id: 'u2', name: 'Alan Turing' },
	{ id: 'u3', name: 'Grace Hopper' },
]
const ids = (q: string) => filterMentionMembers(members, q).map((m) => m.id)

describe('filterMentionMembers', () => {
	it('matches a case-insensitive substring; empty query keeps all', () => {
		expect(ids('')).toEqual(['u1', 'u2', 'u3'])
		expect(ids('grace')).toEqual(['u3'])
		expect(ids('AL')).toEqual(['u2']) // "Alan", case-insensitive; "Ada Lovelace" has no "al"
		expect(ids('zzz')).toEqual([])
	})
})
