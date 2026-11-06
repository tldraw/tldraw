import { describe, expect, it, vi } from 'vitest'
import { processCollectionItemEffect } from './collectionEffects'
import { getCollectionItemContentKey, getCollectionItemThumbnailKey } from './collectionStorage'

const row = (command: 'insert' | 'update' | 'delete') =>
	({ id: 1, tableName: 'collection_item', entityId: 'item_a', command, payload: {} }) as any

function makeDeps(ownedUploads: string[]) {
	const calls: string[] = []
	return {
		calls,
		deps: {
			deleteStoredObjects: vi.fn(async (keys: string[]) => {
				calls.push(`stored:${keys.join(',')}`)
			}),
			getOwnedUploads: vi.fn(async () => ownedUploads),
			deleteUploads: vi.fn(async (names: string[]) => {
				calls.push(`uploads:${names.join(',')}`)
			}),
			forgetOwnedUploads: vi.fn(async (itemId: string) => {
				calls.push(`forget:${itemId}`)
			}),
		},
	}
}

describe('processCollectionItemEffect', () => {
	it("deletes a deleted item's content, thumbnail and owned uploads, forgetting them last", async () => {
		const { deps, calls } = makeDeps(['abc-png', 'def-jpg'])
		await processCollectionItemEffect(deps, row('delete'))
		expect(calls).toEqual([
			'uploads:abc-png,def-jpg',
			'forget:item_a',
			`stored:${getCollectionItemContentKey('item_a')},${getCollectionItemThumbnailKey('item_a')}`,
		])
	})

	it('skips the uploads delete for an item that owns none', async () => {
		const { deps } = makeDeps([])
		await processCollectionItemEffect(deps, row('delete'))
		expect(deps.deleteUploads).not.toHaveBeenCalled()
		expect(deps.deleteStoredObjects).toHaveBeenCalled()
	})

	it('ignores anything but a delete', async () => {
		const { deps } = makeDeps(['abc-png'])
		await processCollectionItemEffect(deps, row('update'))
		expect(deps.getOwnedUploads).not.toHaveBeenCalled()
		expect(deps.deleteStoredObjects).not.toHaveBeenCalled()
	})
})
