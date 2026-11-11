import {
	LibraryRecordType,
	createShapeId,
	createTLSchema,
	type TLLibraryId,
} from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyLibrary } from './copyLibrary'
import { InMemoryLibrarySource } from './InMemoryLibrarySource'
import { LibraryNotFoundError, type LibrarySource } from './LibrarySource'
import { LibraryItemRecordType, type TLLibraryItemContent } from './schema'

const shapeId = createShapeId('box')
const owners = [
	{ id: 'home', name: 'Personal' },
	{ id: 'acme', name: 'Acme workspace' },
]

function content(): TLLibraryItemContent {
	return {
		formatVersion: 1,
		content: {
			shapes: [{ id: shapeId, type: 'geo', x: 0, y: 0, props: {} }] as any,
			bindings: [],
			rootShapeIds: [shapeId],
			assets: [],
			schema: createTLSchema().serialize(),
		},
	}
}

// The source as one written without addItems would be.
const withoutAddItems = (source: LibrarySource): LibrarySource =>
	new Proxy(source, {
		get: (target, key) => {
			if (key === 'addItems') return undefined
			const value = Reflect.get(target, key)
			return typeof value === 'function' ? value.bind(target) : value
		},
	})

function stubFetch(ok: (url: string) => boolean) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) =>
			ok(url)
				? new Response(new Blob(['png'], { type: 'image/png' }))
				: new Response(null, { status: 404 })
		)
	)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('copyLibrary', () => {
	it('copies a library and its items to another owner, leaving the original', async () => {
		stubFetch(() => true)
		const source = new InMemoryLibrarySource({ owners })
		const original = await source.createLibrary('Wireframes')
		const named = await source.addItem(original.id, {
			name: 'Card',
			content: content(),
			thumbnail: new Blob(['png']),
		})
		await source.addItem(original.id, { content: content() })

		const copy = await copyLibrary(source, original.id, 'acme')

		expect(copy).toMatchObject({ name: 'Wireframes', ownerId: 'acme' })
		expect(copy.id).not.toBe(original.id)
		const items = source.getItems(copy.id)
		expect(items).toHaveLength(2)
		const card = items.find((i) => i.name === 'Card')!
		const unnamed = items.find((i) => i.name === undefined)!
		expect(card.id).not.toBe(named.id)
		expect(card.thumbnail).toMatch(/^blob:/)
		expect(unnamed.thumbnail).toBeUndefined()
		expect(await source.getItemContent(card.id)).toEqual(content())
		expect(source.getLibraries().find((c) => c.id === original.id)?.ownerId).toBe('home')
		expect(source.getItems(original.id)).toHaveLength(2)
	})

	it('loads the items a few at a time, then adds the copies together in their order', async () => {
		stubFetch(() => true)
		const source = new InMemoryLibrarySource({ owners })
		const original = await source.createLibrary('Wireframes')
		const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
		for (const name of names) await source.addItem(original.id, { name, content: content() })
		const load = source.getItemContent.bind(source)
		let loading = 0
		let mostAtOnce = 0
		vi.spyOn(source, 'getItemContent').mockImplementation(async (itemId) => {
			mostAtOnce = Math.max(mostAtOnce, ++loading)
			await new Promise((resolve) => setTimeout(resolve, 5))
			loading--
			return load(itemId)
		})
		const addItems = vi.spyOn(source, 'addItems')
		const addItem = vi.spyOn(source, 'addItem')

		const copy = await copyLibrary(source, original.id, 'acme')

		expect(mostAtOnce).toBeGreaterThan(1)
		expect(mostAtOnce).toBeLessThan(names.length)
		expect(addItems).toHaveBeenCalledTimes(1)
		expect(addItem).not.toHaveBeenCalled()
		const listed = (id: TLLibraryId) => source.getItems(id).map((i) => i.name)
		const byCreation = [...source.getItems(copy.id)]
			.sort((a, b) => a.createdAt! - b.createdAt!)
			.map((i) => i.name)
		expect(byCreation).toEqual(listed(original.id))
		expect(listed(copy.id)).toHaveLength(names.length)
	})

	it('adds the copies one at a time, in order, to a source without addItems', async () => {
		const memory = new InMemoryLibrarySource({ owners })
		const original = await memory.createLibrary('Wireframes')
		for (const name of ['A', 'B', 'C'])
			await memory.addItem(original.id, { name, content: content() })
		const addItem = vi.spyOn(memory, 'addItem')

		const copy = await copyLibrary(withoutAddItems(memory), original.id, 'acme')

		expect(addItem).toHaveBeenCalledTimes(3)
		const byCreation = [...memory.getItems(copy.id)]
			.sort((a, b) => a.createdAt! - b.createdAt!)
			.map((i) => i.name)
		expect(byCreation).toEqual(memory.getItems(original.id).map((i) => i.name))
	})

	it('copies a read-only library', async () => {
		const pack = LibraryRecordType.create({ name: 'Prefabs', ownerId: 'home' })
		const item = LibraryItemRecordType.create({ libraryId: pack.id, name: 'Card' })
		const source = new InMemoryLibrarySource({
			owners,
			can: (_, libraryId) => libraryId !== pack.id,
			initial: { libraries: [pack], items: [item], contents: { [item.id]: content() } },
		})
		const copy = await copyLibrary(source, pack.id, 'acme')
		expect(source.can('addItem', copy.id)).toBe(true)
		expect(source.getItems(copy.id).map((i) => i.name)).toEqual(['Card'])
	})

	it('leaves out a thumbnail that cannot be fetched', async () => {
		stubFetch(() => false)
		const source = new InMemoryLibrarySource({ owners })
		const original = await source.createLibrary('Wireframes')
		await source.addItem(original.id, {
			content: content(),
			thumbnail: { light: new Blob(['l']), dark: new Blob(['d']) },
		})
		const copy = await copyLibrary(source, original.id, 'acme')
		expect(source.getItems(copy.id)[0].thumbnail).toBeUndefined()
	})

	it('deletes the partial copy when an item cannot be copied', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const original = await source.createLibrary('Wireframes')
		await source.addItem(original.id, { content: content() })
		vi.spyOn(source, 'getItemContent').mockRejectedValue(new Error('offline'))
		await expect(copyLibrary(source, original.id, 'acme')).rejects.toThrow('offline')
		expect(source.getLibraries().map((c) => c.id)).toEqual([original.id])
	})

	it('refuses a missing library or owner', async () => {
		const source = new InMemoryLibrarySource({ owners })
		const original = await source.createLibrary('Wireframes')
		await expect(copyLibrary(source, LibraryRecordType.createId('nope'), 'acme')).rejects.toThrow(
			LibraryNotFoundError
		)
		await expect(copyLibrary(source, original.id, 'nobody')).rejects.toThrow(LibraryNotFoundError)
		expect(source.getLibraries()).toHaveLength(1)
	})
})
