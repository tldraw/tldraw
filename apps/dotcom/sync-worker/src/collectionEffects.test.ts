import { describe, expect, it, vi } from 'vitest'
import { processCollectionItemEffect } from './collectionEffects'
import { getCollectionItemContentKey, getCollectionItemThumbnailKey } from './collectionStorage'

const row = (command: 'insert' | 'update' | 'delete') =>
	({ id: 1, tableName: 'collection_item', entityId: 'item_a', command, payload: {} }) as any

describe('processCollectionItemEffect', () => {
	it("deletes a deleted item's content and thumbnail", async () => {
		const deleteStoredObjects = vi.fn(async () => {})
		await processCollectionItemEffect({ deleteStoredObjects }, row('delete'))
		expect(deleteStoredObjects).toHaveBeenCalledWith([
			getCollectionItemContentKey('item_a'),
			getCollectionItemThumbnailKey('item_a'),
		])
	})

	it('ignores anything but a delete', async () => {
		const deleteStoredObjects = vi.fn(async () => {})
		await processCollectionItemEffect({ deleteStoredObjects }, row('update'))
		expect(deleteStoredObjects).not.toHaveBeenCalled()
	})
})
