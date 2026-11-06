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

function makeDeps() {
	return { deleteStoredObjects: vi.fn(async () => {}), deleteUploads: vi.fn(async () => {}) }
}

describe('processLibraryItemEffect', () => {
	it("deletes a deleted item's content and the uploads its thumbnails are", async () => {
		const deps = makeDeps()
		await processLibraryItemEffect(
			deps,
			row('delete', {
				light: 'https://content.test/light_1-png',
				dark: 'https://content.test/dark_1-png',
			})
		)
		expect(deps.deleteStoredObjects).toHaveBeenCalledWith([getLibraryItemContentKey('item_a')])
		expect(deps.deleteUploads).toHaveBeenCalledWith(['light_1-png', 'dark_1-png'])
	})

	it('deletes a single thumbnail, and no uploads for an item without one', async () => {
		const deps = makeDeps()
		await processLibraryItemEffect(deps, row('delete', 'https://content.test/only_1-webp'))
		expect(deps.deleteUploads).toHaveBeenCalledWith(['only_1-webp'])

		const without = makeDeps()
		await processLibraryItemEffect(without, row('delete'))
		expect(without.deleteUploads).not.toHaveBeenCalled()
		expect(without.deleteStoredObjects).toHaveBeenCalled()
	})

	it('ignores anything but a delete', async () => {
		const deps = makeDeps()
		await processLibraryItemEffect(deps, row('update', 'https://content.test/only_1-webp'))
		expect(deps.deleteStoredObjects).not.toHaveBeenCalled()
		expect(deps.deleteUploads).not.toHaveBeenCalled()
	})
})
