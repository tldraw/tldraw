import { expect, it } from 'vitest'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { canCreateNewLibrary, createNewLibrary } from './new-library'

const owners = [
	{ id: 'pack', name: 'Pack' },
	{ id: 'me', name: 'Personal' },
]

const sourceDefaultingTo = (defaultOwnerId: string) =>
	new InMemoryLibrarySource({
		owners,
		defaultOwnerId,
		can: (_, target) => typeof target !== 'object' || target.ownerId === 'me',
	})

it('asks about the default owner when the source has one', () => {
	expect(canCreateNewLibrary(sourceDefaultingTo('me'))).toBe(true)
	expect(canCreateNewLibrary(sourceDefaultingTo('pack'))).toBe(false)
})

it('asks about the source as a whole when it has no default owner', () => {
	expect(canCreateNewLibrary(new InMemoryLibrarySource())).toBe(true)
	expect(canCreateNewLibrary(new InMemoryLibrarySource({ can: () => false }))).toBe(false)
})

it('creates for the owner it is given rather than the default owner', async () => {
	const source = new InMemoryLibrarySource({ owners, defaultOwnerId: 'me' })
	expect((await createNewLibrary(source, 'Icons', 'pack')).ownerId).toBe('pack')
	expect((await createNewLibrary(source, 'Shapes')).ownerId).toBe('me')
})
