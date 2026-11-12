import type { TLLibrary, TLLibraryId } from '../lib/schema'
import { getLibraryGrouping, groupLibraryList } from './library-groups'

const library = (id: string, ownerId?: string) =>
	({ id: id as TLLibraryId, name: id, ownerId }) as TLLibrary
const owners = [
	{ id: 'me', name: 'Private to you' },
	{ id: 'team', name: 'Team' },
]

it("doesn't group a source with fewer than two owners", () => {
	expect(getLibraryGrouping([])).toBeUndefined()
	expect(getLibraryGrouping([owners[0]])).toBeUndefined()
	const all = [library('a', 'me'), library('b')]
	expect(groupLibraryList(all, undefined)).toEqual([{ libraries: all }])
})

it("puts groups in the owners' order and keeps each group's libraries in order", () => {
	const groups = groupLibraryList(
		[library('a', 'team'), library('b', 'me'), library('c', 'team'), library('d', 'me')],
		getLibraryGrouping(owners)
	)
	expect(groups.map((g) => [g.key, g.label, g.libraries.map((c) => c.name)])).toEqual([
		['me', 'Private to you', ['b', 'd']],
		['team', 'Team', ['a', 'c']],
	])
})

it('puts libraries without a known owner last, in a group with no owner', () => {
	const groups = groupLibraryList(
		[library('a'), library('b', 'gone'), library('c', 'team')],
		getLibraryGrouping(owners)
	)
	expect(groups.map((g) => [g.key, g.label, g.libraries.map((c) => c.name)])).toEqual([
		['me', 'Private to you', []],
		['team', 'Team', ['c']],
		[undefined, undefined, ['a', 'b']],
	])
})

it('keeps owners with no libraries, so each owner has a group to create libraries in', () => {
	expect(groupLibraryList([], getLibraryGrouping(owners))).toEqual([
		{ key: 'me', label: 'Private to you', libraries: [] },
		{ key: 'team', label: 'Team', libraries: [] },
	])
})
