import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import type { TldrawApp } from '../../app/TldrawApp'
import { TldrawAppCollectionsSource } from './collectionsSource'

let lastUserId = 0
const newUserId = () => `user-${++lastUserId}`

// The source reads only these members off the app, so a stub stands in for a full TldrawApp. Each
// user has their own saved collections, so a new user starts from nothing saved.
function createSource(userId = newUserId()) {
	const app = {
		userId,
		getHomeWorkspaceId: () => 'home',
		getWorkspaceMemberships: () => [
			{ groupId: 'home', group: { name: 'Home' } },
			{ groupId: 'acme', group: { name: 'Acme' } },
		],
		msg: (message: { defaultMessage: string }) => message.defaultMessage,
	}
	return new TldrawAppCollectionsSource(app as unknown as TldrawApp)
}

const names = (source: TldrawAppCollectionsSource) =>
	source.getCollections().map((collection) => collection.name)

describe('TldrawAppCollectionsSource', () => {
	it('lists the open file as the first owner, and no file owner when none is open', () => {
		const source = createSource()
		expect(source.getCollectionOwners().map((owner) => owner.id)).toEqual(['home', 'acme'])
		source.setOpenFileId('file-a')
		expect(source.getCollectionOwners()).toEqual([
			{ id: 'file-a', name: 'This board' },
			{ id: 'home', name: 'Home' },
			{ id: 'acme', name: 'Acme' },
		])
	})

	it('creates new collections under the open file, or the home workspace with none open', () => {
		const source = createSource()
		expect(source.getDefaultOwnerId()).toBe('home')
		source.setOpenFileId('file-a')
		expect(source.getDefaultOwnerId()).toBe('file-a')
	})

	it("lists a file's collections only while that file is open", async () => {
		const source = createSource()
		source.setOpenFileId('file-a')
		await source.createCollection('Board kit', { ownerId: 'file-a' })
		expect(names(source)).toContain('Board kit')

		source.setOpenFileId('file-b')
		expect(names(source)).not.toContain('Board kit')
		expect(names(source)).toEqual([])

		source.setOpenFileId('file-a')
		expect(names(source)).toContain('Board kit')
	})

	it('moves a collection between the open file and a workspace', async () => {
		const source = createSource()
		source.setOpenFileId('file-a')
		const collection = await source.createCollection('Board kit', { ownerId: 'file-a' })
		await source.moveCollection(collection.id, 'home')
		source.setOpenFileId('file-b')
		expect(names(source)).toContain('Board kit')
		await source.moveCollection(collection.id, 'file-b')
		source.setOpenFileId(undefined)
		expect(names(source)).not.toContain('Board kit')
	})

	it('keeps each collection with its owner across a reload', async () => {
		const userId = newUserId()
		const source = createSource(userId)
		source.setOpenFileId('file-a')
		await source.createCollection('Board kit', { ownerId: 'file-a' })
		const teamKit = await source.createCollection('Team kit', { ownerId: 'home' })
		await source.moveCollection(teamKit.id, 'acme')
		source.dispose()

		const reloaded = createSource(userId)
		reloaded.setOpenFileId('file-b')
		await vi.waitFor(() => expect(names(reloaded)).toContain('Team kit'))
		expect(reloaded.getCollections().find((c) => c.name === 'Team kit')?.ownerId).toBe('acme')
		expect(names(reloaded)).not.toContain('Board kit')
		reloaded.setOpenFileId('file-a')
		expect(names(reloaded)).toContain('Board kit')
	})
})
