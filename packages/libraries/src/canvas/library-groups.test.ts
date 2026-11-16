import { LibraryRecordType, type TLLibrary, type TLLibraryId } from 'tldraw'
import { CompositeLibrarySource } from '../lib/CompositeLibrarySource'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
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

it("gives each group its owner's icon", () => {
	const withIcons = [{ ...owners[0], icon: 'home' }, owners[1]]
	const groups = groupLibraryList([], getLibraryGrouping(withIcons))
	expect(groups.map((g) => [g.key, g.icon])).toEqual([
		['me', 'home'],
		['team', undefined],
	])
})

it("puts the libraries of composite parts naming the same owner in that owner's one group", async () => {
	const generated = new InMemoryLibrarySource({
		owners: [{ id: 'team', name: 'Generated' }],
		can: () => false,
		initial: {
			libraries: [LibraryRecordType.create({ name: 'Members', ownerId: 'team' })],
			items: [],
			contents: {},
		},
	})
	const source = new CompositeLibrarySource({
		parts: [
			{ owner: owners[0], source: new InMemoryLibrarySource({ id: 'mine' }) },
			{ owner: owners[1], source: new InMemoryLibrarySource({ id: 'team' }) },
			{ source: generated },
		],
	})
	await source.createLibrary('Kit', { ownerId: 'team' })
	const groups = groupLibraryList(
		source.getLibraries(),
		getLibraryGrouping(source.getLibraryOwners())
	)
	expect(groups.map((g) => [g.key, g.label, g.libraries.map((c) => c.name)])).toEqual([
		['me', 'Private to you', []],
		['team', 'Team', ['Kit', 'Members']],
	])
})
