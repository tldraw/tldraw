import { createShapeId, createTLSchema, LibraryRecordType } from '@tldraw/tlschema'
import { expect, it, vi } from 'vitest'
import { addPackToDocument } from './addPackToDocument'
import { InMemoryLibrarySource } from './InMemoryLibrarySource'
import type { LibraryPack } from './LibraryPack'

const shapeId = createShapeId('box')
const pack: LibraryPack = {
	id: 'wireframing',
	name: 'Wireframing',
	version: 1,
	items: [
		{
			id: 'button',
			name: 'Button',
			content: {
				formatVersion: 1,
				content: {
					shapes: [{ id: shapeId, type: 'geo', x: 0, y: 0, props: {} }] as any,
					bindings: [],
					rootShapeIds: [shapeId],
					assets: [],
					schema: createTLSchema().serialize(),
				},
			},
		},
	],
}

const owners = [
	{ id: 'home', name: 'Home' },
	{ id: 'acme', name: 'Acme' },
]
const copyOf = (id: string, ownerId: string) =>
	LibraryRecordType.create({
		id: LibraryRecordType.createId(id),
		name: 'Wireframing',
		ownerId,
		meta: { packId: 'wireframing', packVersion: 1 },
	})

function setUp(libraries = [copyOf('copy', 'home')]) {
	const mine = LibraryRecordType.create({ name: 'My stash', ownerId: 'home' })
	return new InMemoryLibrarySource({
		owners,
		initial: { libraries: [mine, ...libraries], items: [], contents: {} },
		shownInDocument: [{ libraryId: mine.id, placement: 'default' }],
	})
}

it('adds an available copy of the pack rather than copying it again', async () => {
	const source = setUp()
	const loadPack = vi.fn(async () => pack)
	const id = await addPackToDocument(source, 'wireframing', loadPack, { ownerId: 'acme' })
	expect(id).toBe(LibraryRecordType.createId('copy'))
	expect(source.getLibraryPlacement!(id)).toBe('added')
	expect(loadPack).not.toHaveBeenCalled()
	expect(source.getLibraries()).toHaveLength(2)
})

it('copies the pack where it is told when no copy is available, and adds the copy', async () => {
	const source = setUp([])
	const id = await addPackToDocument(source, 'wireframing', async () => pack, { ownerId: 'acme' })
	const copy = source.getLibraries().find((library) => library.id === id)
	expect(copy).toMatchObject({ name: 'Wireframing', ownerId: 'acme' })
	expect(source.getLibraryPlacement!(id)).toBe('added')
	expect(source.getItems(id).map((item) => item.name)).toEqual(['Button'])
})

it('does nothing for a pack the document already shows', async () => {
	const source = setUp()
	const first = await addPackToDocument(source, 'wireframing', async () => pack)
	const loadPack = vi.fn(async () => pack)
	expect(await addPackToDocument(source, 'wireframing', loadPack)).toBe(first)
	expect(loadPack).not.toHaveBeenCalled()
})
