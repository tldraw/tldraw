import { describe, expect, it, vi } from 'vitest'
import { processLibraryItemObjectEffect } from './libraryEffects'

const row = (command: 'insert' | 'update' | 'delete') =>
	({
		id: 1,
		tableName: 'library_item_object',
		entityId: 'uploads/abc-png',
		command,
		payload: { bucket: 'uploads', objectName: 'abc-png' },
	}) as any

function makeDeps(used: boolean) {
	return {
		isObjectUsed: vi.fn(async () => used),
		deleteObject: vi.fn(async () => {}),
	}
}

describe('processLibraryItemObjectEffect', () => {
	it('deletes an object no item uses', async () => {
		const deps = makeDeps(false)
		await processLibraryItemObjectEffect(deps, row('delete'))
		expect(deps.isObjectUsed).toHaveBeenCalledWith({ bucket: 'uploads', objectName: 'abc-png' })
		expect(deps.deleteObject).toHaveBeenCalledWith({ bucket: 'uploads', objectName: 'abc-png' })
	})

	it('keeps an object an item has come to use since it was queued', async () => {
		const deps = makeDeps(true)
		await processLibraryItemObjectEffect(deps, row('delete'))
		expect(deps.deleteObject).not.toHaveBeenCalled()
	})

	it('ignores anything but a delete', async () => {
		const deps = makeDeps(false)
		await processLibraryItemObjectEffect(deps, row('update'))
		expect(deps.isObjectUsed).not.toHaveBeenCalled()
		expect(deps.deleteObject).not.toHaveBeenCalled()
	})
})
