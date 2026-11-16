import { expect, it } from 'vitest'
import { CompositeLibrarySource } from '../lib/CompositeLibrarySource'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { getOwnerChoices } from './owner-choices'

const me = { id: 'me', name: 'Personal' }
const team = { id: 'team', name: 'Team' }
const pack = { id: 'pack', name: 'Pack' }

const sourceAllowing = (...ownerIds: string[]) =>
	new InMemoryLibrarySource({
		owners: [me, team, pack],
		can: (_, target) => typeof target === 'object' && ownerIds.includes(target.ownerId),
	})

it('offers only owners that allow creating a library, and marks the current one for moving', () => {
	expect(getOwnerChoices(sourceAllowing('me', 'team'), 'me')).toEqual({
		move: [me, team],
		copy: [team],
	})
})

it('keeps the current owner in the move list even when it refuses new libraries', () => {
	expect(getOwnerChoices(sourceAllowing('me', 'team'), 'pack')).toEqual({
		move: [me, team, pack],
		copy: [me, team],
	})
})

it('offers nothing when no other owner allows creating a library', () => {
	expect(getOwnerChoices(sourceAllowing('me'), 'me')).toEqual({ move: [], copy: [] })
	expect(getOwnerChoices(new InMemoryLibrarySource(), undefined)).toEqual({
		move: [],
		copy: [],
	})
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
	expect(getOwnerChoices(source, 'me')).toEqual({
		move: [me, { id: 'team', name: 'Team' }],
		copy: [{ id: 'team', name: 'Team' }],
	})
})
