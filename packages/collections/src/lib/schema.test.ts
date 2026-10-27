import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import {
	CollectionItemContentTooNewError,
	collectionItemValidator,
	collectionValidator,
	parseCollectionItemContent,
} from './schema'

const shapeId = createShapeId('box')

function itemContent(overrides: Record<string, unknown> = {}) {
	return {
		formatVersion: 1,
		content: {
			shapes: [{ id: shapeId, type: 'geo', x: 0, y: 0, props: {} }],
			bindings: [],
			rootShapeIds: [shapeId],
			assets: [],
			schema: createTLSchema().serialize(),
		},
		...overrides,
	}
}

describe('collectionValidator', () => {
	it('accepts a collection', () => {
		const collection = { id: 'col_1', name: 'Wireframes', readOnly: false }
		expect(collectionValidator.validate(collection)).toEqual(collection)
	})

	it('accepts a collection that leaves readOnly out', () => {
		const collection = { id: 'col_1', name: 'Wireframes' }
		expect(collectionValidator.validate(collection)).toEqual(collection)
	})

	it('rejects a blank name', () => {
		expect(() =>
			collectionValidator.validate({ id: 'col_1', name: '  ', readOnly: false })
		).toThrow()
	})

	it('rejects unknown properties', () => {
		expect(() =>
			collectionValidator.validate({ id: 'col_1', name: 'Icons', readOnly: false, color: 'red' })
		).toThrow()
	})
})

describe('collectionItemValidator', () => {
	const item = {
		id: 'item_1',
		collectionId: 'col_1',
		name: 'Card',
		version: 1,
	}

	it('accepts an item without a thumbnail', () => {
		expect(collectionItemValidator.validate(item)).toEqual(item)
	})

	it('accepts an item with a thumbnail', () => {
		const withThumbnail = { ...item, thumbnailUrl: 'https://x/t.png' }
		expect(collectionItemValidator.validate(withThumbnail)).toEqual(withThumbnail)
	})

	it('accepts an item without a name', () => {
		const { name: _name, ...unnamed } = item
		expect(collectionItemValidator.validate(unnamed)).toEqual(unnamed)
	})

	it('rejects a blank name, so leaving it out stays the only way to say there is none', () => {
		expect(() => collectionItemValidator.validate({ ...item, name: '  ' })).toThrow()
	})

	it('rejects a blank or null thumbnail, so leaving it out stays the only way to say there is none', () => {
		expect(() => collectionItemValidator.validate({ ...item, thumbnailUrl: '' })).toThrow()
		expect(() => collectionItemValidator.validate({ ...item, thumbnailUrl: null })).toThrow()
	})

	it('rejects a non-integer version', () => {
		expect(() =>
			collectionItemValidator.validate({
				id: 'item_1',
				collectionId: 'col_1',
				name: 'Card',
				version: 1.5,
			})
		).toThrow()
	})
})

describe('parseCollectionItemContent', () => {
	it('accepts current-format content', () => {
		const value = itemContent()
		expect(parseCollectionItemContent(value)).toEqual(value)
	})

	it('accepts content without bindings', () => {
		const value = itemContent()
		delete (value.content as { bindings?: unknown }).bindings
		expect(parseCollectionItemContent(value)).toEqual(value)
	})

	it('refuses content from a newer format instead of dropping what it added', () => {
		expect(() => parseCollectionItemContent(itemContent({ formatVersion: 2 }))).toThrow(
			CollectionItemContentTooNewError
		)
	})

	it('rejects values that are not item content', () => {
		expect(() => parseCollectionItemContent(null)).toThrow()
		expect(() => parseCollectionItemContent({ content: {} })).toThrow()
		expect(() => parseCollectionItemContent(itemContent({ formatVersion: 0 }))).toThrow()
	})

	it('rejects root shape ids that are not shape ids', () => {
		const value = itemContent()
		value.content.rootShapeIds = ['page:1' as typeof shapeId]
		expect(() => parseCollectionItemContent(value)).toThrow()
	})

	it('rejects unknown envelope fields, so a newer format cannot pass as the current one', () => {
		expect(() => parseCollectionItemContent(itemContent({ parameters: [] }))).toThrow()
	})
})
