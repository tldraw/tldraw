import 'fake-indexeddb/auto'
import { copyPack } from '@tldraw/collections'
import { describe, expect, it, vi } from 'vitest'
import type { TldrawApp } from '../../app/TldrawApp'
import { TldrawAppCollectionsSource } from './collectionsSource'
import { STARTER_PACKS } from './starterPacks'

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
	it("lists the user's workspaces as owners, home first, and creates new collections there", async () => {
		const source = createSource()
		expect(source.getCollectionOwners()).toEqual([
			{ id: 'home', name: 'Home' },
			{ id: 'acme', name: 'Acme' },
		])
		expect(source.getDefaultOwnerId()).toBe('home')
		const collection = await source.createCollection('Team kit')
		expect(collection.ownerId).toBe('home')
	})

	it('keeps each collection with its owner across a reload', async () => {
		const userId = newUserId()
		const source = createSource(userId)
		await source.createCollection('Home kit')
		const teamKit = await source.createCollection('Team kit', { ownerId: 'home' })
		await source.moveCollection(teamKit.id, 'acme')
		source.dispose()

		const reloaded = createSource(userId)
		await vi.waitFor(() => expect(names(reloaded)).toEqual(['Home kit', 'Team kit']))
		expect(reloaded.getCollections().find((c) => c.name === 'Team kit')?.ownerId).toBe('acme')
	})

	it('copies a starter pack into the home workspace and remembers which pack it was', async () => {
		const userId = newUserId()
		const source = createSource(userId)
		const doodles = STARTER_PACKS.find((pack) => pack.id === 'doodles')!
		const copy = await copyPack(source, doodles)
		expect(copy).toMatchObject({ name: doodles.name, ownerId: 'home' })
		expect(source.getItems(copy.id)).toHaveLength(doodles.items.length)
		source.dispose()

		const reloaded = createSource(userId)
		await vi.waitFor(() => expect(names(reloaded)).toEqual([doodles.name]))
		expect(reloaded.getCollections()[0].meta).toEqual({
			packId: 'doodles',
			packVersion: doodles.version,
		})
	})
})
