import { expect, it } from 'vitest'
import { CompositeLibrarySource } from '../lib/CompositeLibrarySource'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { getCopyOwners } from './copy-owners'

const me = { id: 'me', name: 'Personal' }
const team = { id: 'team', name: 'Team' }
const pack = { id: 'pack', name: 'Pack' }

const sourceAllowing = (...ownerIds: string[]) =>
	new InMemoryLibrarySource({
		owners: [me, team, pack],
		can: (_, target) => typeof target === 'object' && ownerIds.includes(target.ownerId),
	})

it('offers the other owners that allow creating a library', () => {
	expect(getCopyOwners(sourceAllowing('me', 'team'), 'me')).toEqual([team])
	expect(getCopyOwners(sourceAllowing('me', 'team'), 'pack')).toEqual([me, team])
})

it('offers nothing when no other owner allows creating a library', () => {
	expect(getCopyOwners(sourceAllowing('me'), 'me')).toEqual([])
	expect(getCopyOwners(new InMemoryLibrarySource(), undefined)).toEqual([])
})

it('offers an owner two parts of a composite name once, as its writable first part allows', () => {
	const team = new InMemoryLibrarySource({ id: 'team' })
	const generated = new InMemoryLibrarySource({
		owners: [{ id: 'team', name: 'Generated' }],
		can: () => false,
	})
	const source = new CompositeLibrarySource({
		parts: [
			{ owner: me, source: new InMemoryLibrarySource({ id: 'mine' }) },
			{ owner: { id: 'team', name: 'Team' }, source: team },
			{ source: generated },
		],
	})
	expect(getCopyOwners(source, 'me')).toEqual([{ id: 'team', name: 'Team' }])
})
