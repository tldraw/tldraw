import { describe, expect, it, vi } from 'vitest'
import { processLibraryItemEffect } from './libraryEffects'
import { getLibraryItemContentKey } from './libraryStorage'

const row = (command: 'insert' | 'update' | 'delete', thumbnail: unknown = null) =>
	({
		id: 1,
		tableName: 'library_item',
		entityId: 'item_a',
		command,
		payload: { id: 'item_a', thumbnail },
	}) as any

function makeDeps(ownedUploads: string[] = []) {
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

describe('processLibraryItemEffect', () => {
	it("deletes a deleted item's thumbnails, owned uploads and content, forgetting the uploads last", async () => {
		const { deps, calls } = makeDeps(['abc-png', 'def-jpg'])
		await processLibraryItemEffect(
			deps,
			row('delete', {
				light: 'https://content.test/light_1-png',
				dark: 'https://content.test/dark_1-png',
			})
		)
		expect(calls).toEqual([
			'uploads:light_1-png,dark_1-png,abc-png,def-jpg',
			'forget:item_a',
			`stored:${getLibraryItemContentKey('item_a')}`,
		])
	})

	it('deletes a single thumbnail', async () => {
		const { deps } = makeDeps()
		await processLibraryItemEffect(deps, row('delete', 'https://content.test/only_1-webp'))
		expect(deps.deleteUploads).toHaveBeenCalledWith(['only_1-webp'])
	})

	it('skips the uploads delete for an item with no thumbnail that owns none', async () => {
		const { deps } = makeDeps()
		await processLibraryItemEffect(deps, row('delete'))
		expect(deps.deleteUploads).not.toHaveBeenCalled()
		expect(deps.deleteStoredObjects).toHaveBeenCalled()
	})

	it('ignores anything but a delete', async () => {
		const { deps } = makeDeps(['abc-png'])
		await processLibraryItemEffect(deps, row('update', 'https://content.test/only_1-webp'))
		expect(deps.getOwnedUploads).not.toHaveBeenCalled()
		expect(deps.deleteUploads).not.toHaveBeenCalled()
		expect(deps.deleteStoredObjects).not.toHaveBeenCalled()
	})
})
