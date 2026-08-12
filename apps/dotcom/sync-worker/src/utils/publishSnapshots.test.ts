import { TlaFile } from '@tldraw/dotcom-shared'
import { describe, expect, it, vi } from 'vitest'
import { Environment } from '../types'
import { publishSnapshot, unpublishSnapshot } from './publishSnapshots'

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

function makeEnv() {
	return {
		ROOMS: { get: vi.fn() },
		ROOM_SNAPSHOTS: { put: vi.fn(), delete: vi.fn() },
		SNAPSHOT_SLUG_TO_PARENT_SLUG: { put: vi.fn(), delete: vi.fn() },
		TLDR_DOC: {
			idFromName: vi.fn(() => 'id'),
			get: vi.fn(() => ({ awaitPersist: vi.fn(async () => {}) })),
		},
	}
}

describe('publishSnapshot', () => {
	it('throws when no snapshot exists for the file', async () => {
		const env = makeEnv()
		env.ROOMS.get.mockResolvedValue(null)
		await expect(publishSnapshot(env as any as Environment, file({ id: 'f1' }))).rejects.toThrow(
			'Snapshot not found for file f1'
		)
		expect(env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put).not.toHaveBeenCalled()
	})

	it('puts the snapshot to KV and R2 on the happy path', async () => {
		const env = makeEnv()
		const awaitPersist = vi.fn(async () => {})
		env.TLDR_DOC.get.mockReturnValue({ awaitPersist })
		env.ROOMS.get.mockResolvedValue({ blob: async () => new Blob(['x']), size: 1 })
		await publishSnapshot(env as any as Environment, file({ id: 'f1', publishedSlug: 'slug-1' }))

		expect(awaitPersist).toHaveBeenCalledTimes(1)
		expect(env.ROOMS.get).toHaveBeenCalledWith('app_rooms/f1')
		expect(env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put).toHaveBeenCalledWith('slug-1', 'f1')
		expect(env.ROOM_SNAPSHOTS.put).toHaveBeenCalledTimes(2)
		expect(env.ROOM_SNAPSHOTS.put.mock.calls[0][0]).toBe('app_rooms/f1/slug-1')
		expect(env.ROOM_SNAPSHOTS.put.mock.calls[1][0]).toMatch(/^app_rooms\/f1\/slug-1\|/)

		// awaitPersist must resolve before the snapshot is read from R2, or the read can race a
		// stale blob.
		const awaitPersistOrder = awaitPersist.mock.invocationCallOrder[0]
		const roomsGetOrder = env.ROOMS.get.mock.invocationCallOrder[0]
		expect(awaitPersistOrder).toBeLessThan(roomsGetOrder)
	})

	it('no-ops when publishedSlug is empty', async () => {
		const env = makeEnv()
		await publishSnapshot(env as any as Environment, file({ id: 'f1', publishedSlug: '' }))
		expect(env.TLDR_DOC.get).not.toHaveBeenCalled()
		expect(env.ROOMS.get).not.toHaveBeenCalled()
		expect(env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put).not.toHaveBeenCalled()
		expect(env.ROOM_SNAPSHOTS.put).not.toHaveBeenCalled()
	})
})

describe('unpublishSnapshot', () => {
	it('returns without touching KV/R2 when publishedSlug is empty', async () => {
		const env = makeEnv()
		await unpublishSnapshot(env as any as Environment, file({ publishedSlug: '' }))
		expect(env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete).not.toHaveBeenCalled()
		expect(env.ROOM_SNAPSHOTS.delete).not.toHaveBeenCalled()
	})

	it('deletes the mapping and snapshot when publishedSlug is set', async () => {
		const env = makeEnv()
		await unpublishSnapshot(env as any as Environment, file({ id: 'f1', publishedSlug: 'slug-1' }))
		expect(env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete).toHaveBeenCalledWith('slug-1')
		expect(env.ROOM_SNAPSHOTS.delete).toHaveBeenCalledTimes(1)
	})
})
