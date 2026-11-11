import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'
import { addItemsToLibrary } from './addItemsToLibrary'
import { InMemoryLibrarySource } from './InMemoryLibrarySource'
import type { LibrarySource } from './LibrarySource'
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

// The source as one written without addItems would be.
const withoutAddItems = (source: LibrarySource): LibrarySource =>
	new Proxy(source, {
		get: (target, key) => {
			if (key === 'addItems') return undefined
			const value = Reflect.get(target, key)
			return typeof value === 'function' ? value.bind(target) : value
		},
	})

const newItems = [
	{ name: 'Button', content: content('button') },
	{ name: 'Card', content: content('card') },
	{ name: 'Input', content: content('input') },
]

describe('addItemsToLibrary', () => {
	it("adds the items with the source's addItems, in one call", async () => {
		const source = new InMemoryLibrarySource()
		const library = await source.createLibrary('Wireframes')
		const addItems = vi.spyOn(source, 'addItems')
		const addItem = vi.spyOn(source, 'addItem')
		const items = await addItemsToLibrary(source, library.id, newItems)
		expect(addItems).toHaveBeenCalledTimes(1)
		expect(addItem).not.toHaveBeenCalled()
		expect(items.map((item) => item.name)).toEqual(['Button', 'Card', 'Input'])
	})

	it('adds them one at a time, in order, to a source without addItems', async () => {
		const memory = new InMemoryLibrarySource()
		const library = await memory.createLibrary('Wireframes')
		const addOne = memory.addItem.bind(memory)
		let adding = 0
		let mostAtOnce = 0
		const addItem = vi.spyOn(memory, 'addItem').mockImplementation(async (libraryId, item) => {
			mostAtOnce = Math.max(mostAtOnce, ++adding)
			await new Promise((resolve) => setTimeout(resolve, 1))
			adding--
			return addOne(libraryId, item)
		})
		const items = await addItemsToLibrary(withoutAddItems(memory), library.id, newItems)
		expect(addItem).toHaveBeenCalledTimes(3)
		expect(mostAtOnce).toBe(1)
		expect(items.map((item) => item.name)).toEqual(['Button', 'Card', 'Input'])
	})

	it('keeps the items added before one that fails, one at a time', async () => {
		const memory = new InMemoryLibrarySource()
		const library = await memory.createLibrary('Wireframes')
		await expect(
			addItemsToLibrary(withoutAddItems(memory), library.id, [
				newItems[0],
				{ name: ' ', content: content('blank') },
				newItems[2],
			])
		).rejects.toThrow()
		expect(memory.getItems(library.id).map((item) => item.name)).toEqual(['Button'])
	})
})
