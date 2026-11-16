import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { copyPack } from './copyPack'
import { InMemoryLibrarySource } from './InMemoryLibrarySource'
import type { LibraryPack } from './LibraryPack'
import type { TLLibraryItemContent } from './schema'

function content(name: string): TLLibraryItemContent {
	const id = createShapeId(name)
	return {
		formatVersion: 1,
		content: {
			shapes: [{ id, type: 'geo', x: 0, y: 0, props: {} }] as any,
			bindings: [],
			rootShapeIds: [id],
			assets: [],
			schema: createTLSchema().serialize(),
		},
	}
}

const pack: LibraryPack = {
	id: 'wireframing',
	name: 'Wireframing',
	version: 3,
	items: [
		{ id: 'button', name: 'Button', content: content('button') },
		{ id: 'card', content: content('card') },
	],
}

const owners = [
	{ id: 'home', name: 'Personal' },
	{ id: 'acme', name: 'Acme' },
]

describe('copyPack', () => {
	it('copies a pack as an ordinary library, recording the pack beside the meta it is given', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const copy = await copyPack(source, pack, { ownerId: 'acme', meta: { addedFrom: 'catalogue' } })
		expect(copy).toMatchObject({ name: 'Wireframing', ownerId: 'acme' })
		expect(copy.meta).toEqual({ addedFrom: 'catalogue', packId: 'wireframing', packVersion: 3 })
		const items = source.getItems(copy.id)
		expect(items.map((item) => item.name)).toEqual(['Button', undefined])
		expect(await source.getItemContent(items[0].id)).toEqual(content('button'))
		expect(source.can('renameLibrary', copy.id)).toBe(true)
		expect(source.can('addItem', copy.id)).toBe(true)
	})

	it("uses the source's default owner and records only the pack unless told otherwise", async () => {
		const source = new InMemoryLibrarySource({ owners, defaultOwnerId: 'home' })
		const copy = await copyPack(source, pack)
		expect(copy).toMatchObject({ name: 'Wireframing', ownerId: 'home' })
		expect(copy.meta).toEqual({ packId: 'wireframing', packVersion: 3 })
	})

	it("keeps the pack's id and version over the same keys in the meta it is given", async () => {
		const source = new InMemoryLibrarySource({ owners })
		const copy = await copyPack(source, pack, { meta: { packId: 'other', packVersion: 1 } })
		expect(copy.meta).toEqual({ packId: 'wireframing', packVersion: 3 })
	})

	it("numbers the copy's name when the source already has one by the pack's name", async () => {
		const source = new InMemoryLibrarySource({ owners })
		await source.createLibrary('Wireframing')
		const copy = await copyPack(source, pack)
		expect(copy.name).toBe('Wireframing 1')
	})
})
