import { TlaFile } from '@tldraw/dotcom-shared'
import { describe, expect, it } from 'vitest'
import { getPublishTransition } from './fileEffects'

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

describe('getPublishTransition', () => {
	it('returns null for inserts and deletes', () => {
		expect(
			getPublishTransition({
				command: 'insert',
				payload: file({ published: true }),
				prevPayload: null,
			})
		).toBe(null)
		expect(
			getPublishTransition({
				command: 'delete',
				payload: file({ published: true }),
				prevPayload: null,
			})
		).toBe(null)
	})

	it('returns publish when file becomes published', () => {
		expect(
			getPublishTransition({
				command: 'update',
				payload: file({ published: true, lastPublished: 100 }),
				prevPayload: file({ published: false, lastPublished: 0 }),
			})
		).toBe('publish')
	})

	it('returns publish when file is republished with newer timestamp', () => {
		expect(
			getPublishTransition({
				command: 'update',
				payload: file({ published: true, lastPublished: 200 }),
				prevPayload: file({ published: true, lastPublished: 100 }),
			})
		).toBe('publish')
	})

	it('returns null when file remains published with same timestamp', () => {
		expect(
			getPublishTransition({
				command: 'update',
				payload: file({ published: true, lastPublished: 100 }),
				prevPayload: file({ published: true, lastPublished: 100 }),
			})
		).toBe(null)
	})

	it('returns unpublish when file becomes unpublished', () => {
		expect(
			getPublishTransition({
				command: 'update',
				payload: file({ published: false, lastPublished: 100 }),
				prevPayload: file({ published: true, lastPublished: 100 }),
			})
		).toBe('unpublish')
	})

	it('returns null for a plain update with no publication change', () => {
		expect(
			getPublishTransition({
				command: 'update',
				payload: file({ name: 'renamed' }),
				prevPayload: file({}),
			})
		).toBe(null)
	})
})
