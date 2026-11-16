import { LibraryRecordType, type TLLibrary } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { CompositeLibrarySource } from '../lib/CompositeLibrarySource'
import { InMemoryLibrarySource } from '../lib/InMemoryLibrarySource'
import { getLibraryDestinations, type LibraryDestinationChoice } from './library-destinations'

const me = { id: 'me', name: 'Personal' }
const team = { id: 'team', name: 'Team' }
const pack = { id: 'pack', name: 'Pack' }

const library = (name: string, ownerId: string, parent?: TLLibrary) =>
	LibraryRecordType.create({
		id: LibraryRecordType.createId(name),
		name,
		ownerId,
		...(parent ? { parentId: parent.id } : {}),
	})

// me: kit ─ forms ─ inputs; team: shared; pack: shapes
const kit = library('kit', 'me')
const forms = library('forms', 'me', kit)
const inputs = library('inputs', 'me', forms)
const shared = library('shared', 'team')
const shapes = library('shapes', 'pack')

function sourceAllowing(...ownerIds: string[]) {
	const libraries = [kit, forms, inputs, shared, shapes]
	return new InMemoryLibrarySource({
		owners: [me, team, pack],
		initial: { libraries, items: [], contents: {} },
		// Permissions are the owner's: a library is asked about as its root.
		can: (_, target) =>
			typeof target === 'object'
				? ownerIds.includes(target.ownerId)
				: ownerIds.includes(libraries.find((c) => c.id === target)?.ownerId ?? ''),
	})
}

const list = (choices: LibraryDestinationChoice[]) =>
	choices.map((c) => `${'  '.repeat(c.depth)}${c.label}${c.current ? ' ✓' : ''}`)

describe('getLibraryDestinations', () => {
	it("lists a tree under each owner that allows it, without the moving library's own subtree", () => {
		expect(list(getLibraryDestinations(sourceAllowing('me', 'team'), forms, 'move'))).toEqual([
			'Personal',
			'  kit ✓',
			'Team',
			'  shared',
		])
	})

	it('copies anywhere allowed, beside the library too', () => {
		expect(list(getLibraryDestinations(sourceAllowing('me', 'team'), forms, 'copy'))).toEqual([
			'Personal',
			'  kit ✓',
			'    forms',
			'      inputs',
			'Team',
			'  shared',
		])
	})

	it('keeps where the library is for moving even when it refuses new libraries', () => {
		expect(list(getLibraryDestinations(sourceAllowing('me'), shapes, 'move'))).toEqual([
			'Personal',
			'  kit',
			'    forms',
			'      inputs',
			'Pack ✓',
		])
	})

	it('offers nothing to move to when the only place is where it is', () => {
		expect(getLibraryDestinations(sourceAllowing('team'), shared, 'move')).toEqual([])
		expect(
			getLibraryDestinations(new InMemoryLibrarySource({ can: () => false }), kit, 'move')
		).toEqual([])
	})

	it('lists the top level of a source without owners unnamed', async () => {
		const source = new InMemoryLibrarySource()
		const a = await source.createLibrary('a')
		const b = await source.createLibrary('b', { parentId: a.id })
		expect(getLibraryDestinations(source, b, 'move').map((c) => [c.label, c.depth])).toEqual([
			[undefined, 0],
			['a', 1],
		])
	})

	it('lists an owner two parts of a composite name once, as its writable first part allows', async () => {
		const generated = new InMemoryLibrarySource({
			owners: [{ id: 'team', name: 'Generated' }],
			can: () => false,
			initial: {
				libraries: [LibraryRecordType.create({ name: 'Members', ownerId: 'team' })],
				items: [],
				contents: {},
			},
		})
		const source = new CompositeLibrarySource({
			parts: [
				{ owner: me, source: new InMemoryLibrarySource({ id: 'mine' }) },
				{ owner: team, source: new InMemoryLibrarySource({ id: 'team' }) },
				{ source: generated },
			],
		})
		const kit = await source.createLibrary('Kit', { ownerId: 'me' })
		expect(list(getLibraryDestinations(source, kit, 'move'))).toEqual(['Personal ✓', 'Team'])
		expect(list(getLibraryDestinations(source, kit, 'copy'))).toEqual([
			'Personal ✓',
			'  Kit',
			'Team',
		])
	})
})
