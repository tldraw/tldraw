import { expect, it } from 'vitest'
import { InMemoryCollectionSource } from '../lib/InMemoryCollectionSource'
import { canCreateNewCollection } from './new-collection'

const owners = [
	{ id: 'pack', name: 'Pack' },
	{ id: 'me', name: 'Personal' },
]

const sourceDefaultingTo = (defaultOwnerId: string) =>
	new InMemoryCollectionSource({
		owners,
		defaultOwnerId,
		can: (_, target) => typeof target !== 'object' || target.ownerId === 'me',
	})

it('asks about the default owner when the source has one', () => {
	expect(canCreateNewCollection(sourceDefaultingTo('me'))).toBe(true)
	expect(canCreateNewCollection(sourceDefaultingTo('pack'))).toBe(false)
})

it('asks about the source as a whole when it has no default owner', () => {
	expect(canCreateNewCollection(new InMemoryCollectionSource())).toBe(true)
	expect(canCreateNewCollection(new InMemoryCollectionSource({ can: () => false }))).toBe(false)
})
