import { TlaFile } from '@tldraw/dotcom-shared'
import { describe, expect, it } from 'vitest'
import { RoomNotFoundError, shouldSkipMissingRoomEffect } from './roomEffectHelpers'

function file(partial: Partial<TlaFile>): TlaFile {
	return {
		id: 'f1',
		name: 'file',
		ownerId: 'u1',
		ownerName: '',
		ownerAvatar: '',
		thumbnail: '',
		shared: true,
		sharedLinkType: 'edit',
		published: false,
		lastPublished: 0,
		publishedSlug: 'slug-1',
		createdAt: 0,
		updatedAt: 0,
		isEmpty: false,
		isDeleted: false,
		createSource: null,
		owningGroupId: null,
		...partial,
	}
}

describe('shouldSkipMissingRoomEffect', () => {
	it('skips a RoomNotFoundError for a deleted file', () => {
		expect(
			shouldSkipMissingRoomEffect(new RoomNotFoundError('f1'), file({ isDeleted: true }))
		).toBe(true)
	})

	it('does not skip a RoomNotFoundError for a live file', () => {
		expect(
			shouldSkipMissingRoomEffect(new RoomNotFoundError('f1'), file({ isDeleted: false }))
		).toBe(false)
	})

	it('does not skip a different error for a deleted file', () => {
		expect(shouldSkipMissingRoomEffect(new Error('boom'), file({ isDeleted: true }))).toBe(false)
	})
})
