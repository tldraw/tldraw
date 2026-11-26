import { describe, expect, it } from 'vitest'
import { LibraryItemRecordType } from './schema'
import { trackItemsStoring, whenItemsStored } from './whenItemsStored'

describe('whenItemsStored', () => {
	it('stops tracking items once saving them has failed', async () => {
		const itemId = LibraryItemRecordType.createId()
		trackItemsStoring([itemId], Promise.reject(new Error('storing failed')))
		await expect(whenItemsStored([itemId])).rejects.toThrow('storing failed')
		await expect(whenItemsStored([itemId])).resolves.toBeUndefined()
	})
})
