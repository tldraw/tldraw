// @vitest-environment jsdom
import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { CollectionSource } from './CollectionSource'
import { useCollectionItems, useCollections } from './hooks'
import { InMemoryCollectionSource } from './InMemoryCollectionSource'
import type { TLCollectionId, TLCollectionItemContent } from './schema'

const roots: Root[] = []

beforeAll(() => {
	;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(async () => {
	for (const root of roots.splice(0)) await act(async () => root.unmount())
})

function content(): TLCollectionItemContent {
	const shapeId = createShapeId('box')
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

async function render(element: React.ReactElement) {
	const root = createRoot(document.createElement('div'))
	roots.push(root)
	await act(async () => root.render(element))
}

describe('useCollections', () => {
	it('lists collections and updates when one is added or renamed', async () => {
		const source = new InMemoryCollectionSource()
		let names: string[] = []
		function Names() {
			names = useCollections(source).map((c) => c.name)
			return null
		}
		await render(<Names />)
		expect(names).toEqual([])

		const collection = await act(async () => source.createCollection('Wireframes'))
		expect(names).toEqual(['Wireframes'])
		await act(async () => source.renameCollection(collection.id, 'Icons'))
		expect(names).toEqual(['Icons'])
	})

	it('gives an empty list when there is no source', async () => {
		let result: unknown
		function Names() {
			result = useCollections(null)
			return null
		}
		await render(<Names />)
		expect(result).toEqual([])
	})
})

describe('useCollectionItems', () => {
	it("re-renders only when that collection's items change", async () => {
		const source = new InMemoryCollectionSource()
		const a = await source.createCollection('A')
		const b = await source.createCollection('B')
		let renders = 0
		function Items({ source, id }: { source: CollectionSource; id: TLCollectionId }) {
			useCollectionItems(source, id)
			renders++
			return null
		}
		await render(<Items source={source} id={a.id} />)
		const afterMount = renders

		await act(async () => source.addItem(b.id, { name: 'In B', content: content() }))
		expect(renders).toBe(afterMount)
		await act(async () => source.addItem(a.id, { name: 'In A', content: content() }))
		expect(renders).toBe(afterMount + 1)
	})

	it('gives an empty list without a collection', async () => {
		const source = new InMemoryCollectionSource()
		let result: unknown
		function Items() {
			result = useCollectionItems(source, null)
			return null
		}
		await render(<Items />)
		expect(result).toEqual([])
	})
})
