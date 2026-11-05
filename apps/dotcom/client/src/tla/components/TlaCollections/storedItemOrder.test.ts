import {
	CollectionItemRecordType,
	CollectionRecordType,
	type TLCollectionItem,
} from '@tldraw/collections'
import { describe, expect, it } from 'vitest'
import { nextAddIndex, sortStoredItems } from './storedItemOrder'

const collectionId = CollectionRecordType.createId('c')

function stored(id: string, addIndex?: number, createdAt?: number) {
	return {
		item: CollectionItemRecordType.create({
			id: CollectionItemRecordType.createId(id),
			collectionId,
			createdAt,
		}),
		addIndex,
	}
}

const ids = (items: { item: TLCollectionItem }[]) =>
	items.map(({ item }) => CollectionItemRecordType.parseId(item.id))

describe('sortStoredItems', () => {
	it('restores add order rather than key order', () => {
		// Keys sort z, a, m; the items were added m, z, a.
		const fromDb = [stored('a', 2, 100), stored('m', 0, 100), stored('z', 1, 100)]
		expect(ids(sortStoredItems(fromDb))).toEqual(['m', 'z', 'a'])
	})

	it('puts items saved without an add index first, by save time', () => {
		const fromDb = [stored('a', 0, 50), stored('b', undefined, 300), stored('c', undefined, 200)]
		expect(ids(sortStoredItems(fromDb))).toEqual(['c', 'b', 'a'])
	})

	it('does not change the array it was given', () => {
		const fromDb = [stored('a', 1), stored('b', 0)]
		sortStoredItems(fromDb)
		expect(ids(fromDb)).toEqual(['a', 'b'])
	})
})

describe('nextAddIndex', () => {
	it('counts on from the highest saved index', () => {
		expect(nextAddIndex([])).toBe(0)
		expect(nextAddIndex([stored('a'), stored('b')])).toBe(0)
		expect(nextAddIndex([stored('a', 3), stored('b', 7), stored('c')])).toBe(8)
	})
})
