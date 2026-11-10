import type { TLCollection, TLCollectionId } from '../lib/schema'
import { getCollectionGrouping, groupCollectionList } from './collection-groups'

const collection = (id: string, ownerId?: string) =>
	({ id: id as TLCollectionId, name: id, ownerId }) as TLCollection
const owners = [
	{ id: 'me', name: 'Private to you' },
	{ id: 'team', name: 'Team' },
]

it("doesn't group a source with fewer than two owners", () => {
	expect(getCollectionGrouping([])).toBeUndefined()
	expect(getCollectionGrouping([owners[0]])).toBeUndefined()
	const all = [collection('a', 'me'), collection('b')]
	expect(groupCollectionList(all, undefined)).toEqual([{ collections: all }])
})

it("puts groups in the owners' order and keeps each group's collections in order", () => {
	const groups = groupCollectionList(
		[
			collection('a', 'team'),
			collection('b', 'me'),
			collection('c', 'team'),
			collection('d', 'me'),
		],
		getCollectionGrouping(owners)
	)
	expect(groups.map((g) => [g.key, g.label, g.collections.map((c) => c.name)])).toEqual([
		['me', 'Private to you', ['b', 'd']],
		['team', 'Team', ['a', 'c']],
	])
})

it('puts collections without a known owner last, in a group with no heading', () => {
	const groups = groupCollectionList(
		[collection('a'), collection('b', 'gone'), collection('c', 'team')],
		getCollectionGrouping(owners)
	)
	expect(groups.map((g) => [g.key, g.label, g.collections.map((c) => c.name)])).toEqual([
		['team', 'Team', ['c']],
		[undefined, undefined, ['a', 'b']],
	])
})

it('leaves out owners with no collections', () => {
	const groups = groupCollectionList([collection('a', 'team')], getCollectionGrouping(owners))
	expect(groups.map((g) => g.key)).toEqual(['team'])
})
