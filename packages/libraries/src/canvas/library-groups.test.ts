import type { TLLibrary, TLLibraryId } from 'tldraw'
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

it('puts libraries without a known owner last, in a group with no heading', () => {
	const groups = groupLibraryList(
		[library('a'), library('b', 'gone'), library('c', 'team')],
		getLibraryGrouping(owners)
	)
	expect(groups.map((g) => [g.key, g.label, g.libraries.map((c) => c.name)])).toEqual([
		['team', 'Team', ['c']],
		[undefined, undefined, ['a', 'b']],
	])
})

it('leaves out owners with no libraries', () => {
	const groups = groupLibraryList([library('a', 'team')], getLibraryGrouping(owners))
	expect(groups.map((g) => g.key)).toEqual(['team'])
})
