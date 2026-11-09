import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import {
	CollectionItemContentTooNewError,
	CollectionItemRecordType,
	collectionItemValidator,
	CollectionRecordType,
	collectionValidator,
	getThumbnailForColorMode,
	mapThumbnail,
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
	const collection = CollectionRecordType.create({
		id: CollectionRecordType.createId('wireframes'),
		name: 'Wireframes',
	})

	it('accepts a collection, with readOnly left out or set', () => {
		expect(collectionValidator.validate(collection)).toEqual(collection)
		expect(collectionValidator.validate({ ...collection, readOnly: true })).toEqual({
			...collection,
			readOnly: true,
		})
	})

	it('rejects a blank name', () => {
		expect(() => collectionValidator.validate({ ...collection, name: '  ' })).toThrow()
	})

	it('rejects an id that is not a collection id', () => {
		expect(() => collectionValidator.validate({ ...collection, id: 'wireframes' })).toThrow()
	})

	it('rejects unknown properties', () => {
		expect(() => collectionValidator.validate({ ...collection, color: 'red' })).toThrow()
	})
})

describe('collectionItemValidator', () => {
	const item = CollectionItemRecordType.create({
		id: CollectionItemRecordType.createId('card'),
		collectionId: CollectionRecordType.createId('wireframes'),
		name: 'Card',
	})

	it('accepts an item without a thumbnail, with one, or with a light and dark pair', () => {
		expect(collectionItemValidator.validate(item)).toEqual(item)
		const withOne = { ...item, thumbnail: 'https://x/t.png' }
		expect(collectionItemValidator.validate(withOne)).toEqual(withOne)
		const withPair = {
			...item,
			thumbnail: { light: 'https://x/t.png', dark: 'https://x/t-dark.png' },
		}
		expect(collectionItemValidator.validate(withPair)).toEqual(withPair)
	})

	it('accepts an item without a name', () => {
		const { name: _name, ...unnamed } = item
		expect(collectionItemValidator.validate(unnamed)).toEqual(unnamed)
	})

	it('rejects a blank name or thumbnail, so leaving them out is the only way to say there is none', () => {
		expect(() => collectionItemValidator.validate({ ...item, name: '  ' })).toThrow()
		expect(() => collectionItemValidator.validate({ ...item, thumbnail: '' })).toThrow()
		expect(() => collectionItemValidator.validate({ ...item, thumbnail: null })).toThrow()
		expect(() =>
			collectionItemValidator.validate({
				...item,
				thumbnail: { light: 'https://x/t.png', dark: '' },
			})
		).toThrow()
	})

	it('rejects half a pair: one image for both modes is a plain URL', () => {
		expect(() =>
			collectionItemValidator.validate({ ...item, thumbnail: { light: 'https://x/t.png' } })
		).toThrow()
	})

	it('rejects a collection id that is not a collection id', () => {
		expect(() =>
			collectionItemValidator.validate({ ...item, collectionId: 'wireframes' })
		).toThrow()
	})

	it('rejects a non-integer version', () => {
		expect(() => collectionItemValidator.validate({ ...item, version: 1.5 })).toThrow()
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

describe('getThumbnailForColorMode', () => {
	it('shows a single thumbnail in either mode', () => {
		expect(getThumbnailForColorMode('t.png', 'light')).toBe('t.png')
		expect(getThumbnailForColorMode('t.png', 'dark')).toBe('t.png')
	})

	it('picks the image for the mode from a pair', () => {
		const pair = { light: 'light.png', dark: 'dark.png' }
		expect(getThumbnailForColorMode(pair, 'light')).toBe('light.png')
		expect(getThumbnailForColorMode(pair, 'dark')).toBe('dark.png')
	})
})

describe('mapThumbnail', () => {
	it('keeps a single image single and a pair a pair', () => {
		const upper = (s: string) => s.toUpperCase()
		expect(mapThumbnail('t', upper)).toBe('T')
		expect(mapThumbnail({ light: 'l', dark: 'd' }, upper)).toEqual({ light: 'L', dark: 'D' })
	})
})
