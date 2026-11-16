import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'
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

	it("adds the pack's items together, in the pack's order", async () => {
		const source = new InMemoryLibrarySource({ owners })
		const addItems = vi.spyOn(source, 'addItems')
		const addItem = vi.spyOn(source, 'addItem')
		const copy = await copyPack(source, pack)
		expect(addItems).toHaveBeenCalledTimes(1)
		expect(addItem).not.toHaveBeenCalled()
		const byCreation = [...source.getItems(copy.id)]
			.sort((a, b) => a.createdAt! - b.createdAt!)
			.map((item) => item.name)
		expect(byCreation).toEqual(['Button', undefined])
	})

	it('deletes the copy when its items cannot be added', async () => {
		const source = new InMemoryLibrarySource({ owners })
		vi.spyOn(source, 'addItems').mockRejectedValue(new Error('offline'))
		await expect(copyPack(source, pack)).rejects.toThrow('offline')
		expect(source.getLibraries()).toEqual([])
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

	it("stores each item's meta on its copy", async () => {
		const source = new InMemoryLibrarySource({ owners })
		const copy = await copyPack(source, {
			...pack,
			items: [
				{ id: 'button', name: 'Button', content: content('button'), meta: { category: 'Actions' } },
				{ id: 'card', content: content('card') },
			],
		})
		expect(source.getItems(copy.id).map((item) => item.meta)).toEqual([{ category: 'Actions' }, {}])
	})

	it("numbers the copy's name when the source already has one by the pack's name", async () => {
		const source = new InMemoryLibrarySource({ owners })
		await source.createLibrary('Wireframing')
		const copy = await copyPack(source, pack)
		expect(copy.name).toBe('Wireframing 1')
	})

	it('copies the libraries inside a pack, each inside the one it is in', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const nested: LibraryPack = {
			id: 'architecture',
			name: 'Software architecture',
			version: 1,
			items: [],
			libraries: [
				{
					id: 'compute',
					name: 'Compute',
					items: [{ id: 'server', name: 'Server', content: content('server') }],
					libraries: [
						{
							id: 'serverless',
							name: 'Serverless',
							items: [{ id: 'fn', name: 'Function', content: content('fn') }],
						},
					],
				},
				{
					id: 'data',
					name: 'Data',
					items: [{ id: 'db', name: 'Database', content: content('db') }],
				},
			],
		}
		const copy = await copyPack(source, nested, { ownerId: 'acme' })
		const libraries = source.getLibraries()
		const named = (name: string) => libraries.find((c) => c.name === name)!
		expect(libraries.map((c) => [c.name, c.ownerId])).toEqual([
			['Software architecture', 'acme'],
			['Compute', 'acme'],
			['Serverless', 'acme'],
			['Data', 'acme'],
		])
		expect(named('Compute').parentId).toBe(copy.id)
		expect(named('Serverless').parentId).toBe(named('Compute').id)
		expect(named('Data').parentId).toBe(copy.id)
		expect(source.getItems(named('Serverless').id).map((i) => i.name)).toEqual(['Function'])
		expect(source.getItems(copy.id)).toEqual([])
	})

	it('deletes the whole copy when a library inside it fails to copy', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const broken: LibraryPack = {
			id: 'broken',
			name: 'Broken',
			version: 1,
			items: [],
			libraries: [
				{ id: 'ok', name: 'Ok', items: [{ id: 'a', content: content('a') }] },
				{ id: 'bad', name: 'Bad', items: [{ id: 'b', content: { formatVersion: 99 } as any }] },
			],
		}
		await expect(copyPack(source, broken, { ownerId: 'acme' })).rejects.toThrow()
		expect(source.getLibraries()).toEqual([])
	})

	it('numbers the name only against the libraries the copy sits beside', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const elsewhere = await source.createLibrary('Elsewhere', { ownerId: 'home' })
		await source.createLibrary('Wireframing', { parentId: elsewhere.id })
		await source.createLibrary('Wireframing', { ownerId: 'home' })
		expect((await copyPack(source, pack, { ownerId: 'acme' })).name).toBe('Wireframing')
		expect((await copyPack(source, pack, { ownerId: 'home' })).name).toBe('Wireframing 1')
	})
})
