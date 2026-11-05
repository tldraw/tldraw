import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import type { TldrawApp } from '../../app/TldrawApp'
import { TldrawAppCollectionsSource } from './collectionsSource'
import { TldrawAppCollectionsWithPacks } from './collectionsWithPacks'

let lastUserId = 0
const newUserId = () => `user-${++lastUserId}`

function createSource(userId = newUserId()) {
	const app = {
		userId,
		getHomeWorkspaceId: () => 'home',
		getWorkspaceMemberships: () => [{ groupId: 'home', group: { name: 'Home' } }],
		msg: (message: { defaultMessage: string }) => message.defaultMessage,
	}
	return new TldrawAppCollectionsWithPacks(
		new TldrawAppCollectionsSource(app as unknown as TldrawApp),
		userId
	)
}

const listing = (source: TldrawAppCollectionsWithPacks) =>
	source.getCollections().map((collection) => [collection.name, collection.ownerId])

describe('TldrawAppCollectionsWithPacks', () => {
	it('lists no starter packs until the user adds them', () => {
		const source = createSource()
		expect(listing(source)).toEqual([])
		expect(source.packs.getPacks().map((pack) => pack.name)).toEqual([
			'Wireframing',
			'Diagramming',
			'Floor plan',
			'tldraw characters',
			'Doodles',
		])
	})

	it('keeps added packs per user across a reload, and hides removed ones', () => {
		const userId = newUserId()
		const source = createSource(userId)
		source.packs.addPack('diagramming')
		expect(listing(source)).toEqual([['Diagramming', 'tldraw']])
		source.dispose()

		const reloaded = createSource(userId)
		expect(listing(reloaded)).toEqual([['Diagramming', 'tldraw']])
		expect(listing(createSource())).toEqual([])
		reloaded.packs.removePack('diagramming')
		expect(listing(reloaded)).toEqual([])
		expect(listing(createSource(userId))).toEqual([])
	})

	it("lists added starter packs, read-only, after the user's owners", () => {
		const source = createSource()
		source.packs.addPack('wireframing')
		source.packs.addPack('diagramming')
		source.setOpenFileId('file-a')
		expect(source.getCollectionOwners()).toEqual([
			{ id: 'file-a', name: 'This board' },
			{ id: 'home', name: 'Home' },
			{ id: 'tldraw', name: 'tldraw', readOnly: true },
		])
		expect(listing(source)).toEqual([
			['Wireframing', 'tldraw'],
			['Diagramming', 'tldraw'],
		])
		const [wireframing] = source.getCollections()
		expect(source.can('renameCollection', wireframing.id)).toBe(false)
		expect(source.can('addItem', wireframing.id)).toBe(false)
	})

	it('still creates new collections under the open file', async () => {
		const source = createSource()
		source.setOpenFileId('file-a')
		expect(source.getDefaultOwnerId()).toBe('file-a')
		const collection = await source.createCollection('Board kit')
		expect(collection.ownerId).toBe('file-a')
	})

	it('copies a pack to a workspace, keeping the copy across a reload', async () => {
		const userId = newUserId()
		const source = createSource(userId)
		source.packs.addPack('wireframing')
		source.packs.addPack('diagramming')
		const [wireframing] = source.getCollections()
		await source.moveCollection(wireframing.id, 'home')
		expect(listing(source)).toEqual([
			['Wireframing', 'home'],
			['Wireframing', 'tldraw'],
			['Diagramming', 'tldraw'],
		])
		const copy = source.getCollections()[0]
		expect(source.getItems(copy.id).map((item) => item.name)).toEqual(
			source.getItems(wireframing.id).map((item) => item.name)
		)
		source.dispose()

		const reloaded = createSource(userId)
		await vi.waitFor(() => expect(listing(reloaded)[0]).toEqual(['Wireframing', 'home']))
		const [reloadedCopy] = reloaded.getCollections()
		const button = reloaded.getItems(reloadedCopy.id).find((item) => item.name === 'Button')
		expect(reloaded.getItems(reloadedCopy.id)).toHaveLength(6)
		const content = await reloaded.getItemContent(button!.id)
		expect(content.content.shapes).toHaveLength(1)
	})
})
