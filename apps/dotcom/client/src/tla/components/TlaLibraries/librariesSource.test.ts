import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import type { TldrawApp } from '../../app/TldrawApp'
import { TldrawAppLibrariesSource } from './librariesSource'

let lastUserId = 0
const newUserId = () => `user-${++lastUserId}`

// The source reads only these members off the app, so a stub stands in for a full TldrawApp. Each
// user has their own saved libraries, so a new user starts from nothing saved.
function createSource(userId = newUserId(), workspaceIds = ['home', 'acme']) {
	const names: Record<string, string> = { home: 'Home', acme: 'Acme' }
	const app = {
		userId,
		getHomeWorkspaceId: () => 'home',
		getWorkspaceMemberships: () =>
			workspaceIds.map((groupId) => ({ groupId, group: { name: names[groupId] } })),
		msg: (message: { defaultMessage: string }) => message.defaultMessage,
	}
	return new TldrawAppLibrariesSource(app as unknown as TldrawApp)
}

const names = (source: TldrawAppLibrariesSource) =>
	source.getLibraries().map((library) => library.name)

describe('TldrawAppLibrariesSource', () => {
	it("lists the user's workspaces as owners, home first, and creates new libraries there", async () => {
		const source = createSource()
		expect(source.getLibraryOwners()).toEqual([
			{ id: 'home', name: 'Private to you' },
			{ id: 'acme', name: 'Acme' },
		])
		expect(source.getDefaultOwnerId()).toBe('home')
		expect(source.getLibraries().map((c) => c.ownerId)).toEqual(['home', 'home'])
		const library = await source.createLibrary('Team kit')
		expect(library.ownerId).toBe('home')
	})

	it('keeps each library with its owner across a reload', async () => {
		const userId = newUserId()
		const source = createSource(userId)
		await source.createLibrary('Home kit')
		const teamKit = await source.createLibrary('Team kit')
		await source.moveLibrary(teamKit.id, 'acme')
		source.dispose()

		const reloaded = createSource(userId)
		await vi.waitFor(() =>
			expect(names(reloaded)).toEqual(['Wireframes', 'Icons', 'Home kit', 'Team kit'])
		)
		expect(reloaded.getLibraries().find((c) => c.name === 'Team kit')?.ownerId).toBe('acme')
	})

	it("hides a workspace's libraries once the user is no longer in it", async () => {
		const userId = newUserId()
		const source = createSource(userId)
		await source.createLibrary('Home kit')
		await source.createLibrary('Team kit', { ownerId: 'acme' })
		source.dispose()

		const reloaded = createSource(userId, ['home'])
		await vi.waitFor(() => expect(names(reloaded)).toEqual(['Wireframes', 'Icons', 'Home kit']))
	})
})
