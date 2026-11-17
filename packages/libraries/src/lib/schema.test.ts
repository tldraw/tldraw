import { createShapeId, createTLSchema } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import {
	LibraryItemContentTooNewError,
	LibraryItemRecordType,
	libraryItemValidator,
	LibraryRecordType,
	libraryValidator,
	getThumbnailForColorMode,
	mapThumbnail,
	parseLibraryItemContent,
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

describe('libraryValidator', () => {
	const library = LibraryRecordType.create({
		id: LibraryRecordType.createId('wireframes'),
		name: 'Wireframes',
	})

	it('accepts a library', () => {
		expect(libraryValidator.validate(library)).toEqual(library)
	})

	it('rejects a blank name', () => {
		expect(() => libraryValidator.validate({ ...library, name: '  ' })).toThrow()
	})

	it('accepts an owner, but not a blank one', () => {
		expect(libraryValidator.validate({ ...library, ownerId: 'acme' })).toEqual({
			...library,
			ownerId: 'acme',
		})
		expect(() => libraryValidator.validate({ ...library, ownerId: ' ' })).toThrow()
	})

	it('rejects an id that is not a library id', () => {
		expect(() => libraryValidator.validate({ ...library, id: 'wireframes' })).toThrow()
	})

	it('rejects unknown properties', () => {
		expect(() => libraryValidator.validate({ ...library, color: 'red' })).toThrow()
	})
})

describe('libraryItemValidator', () => {
	const item = LibraryItemRecordType.create({
		id: LibraryItemRecordType.createId('card'),
		libraryId: LibraryRecordType.createId('wireframes'),
		name: 'Card',
	})

	it('accepts an item without a thumbnail, with one, or with a light and dark pair', () => {
		expect(libraryItemValidator.validate(item)).toEqual(item)
		const withOne = { ...item, thumbnail: 'https://x/t.png' }
		expect(libraryItemValidator.validate(withOne)).toEqual(withOne)
		const withPair = {
			...item,
			thumbnail: { light: 'https://x/t.png', dark: 'https://x/t-dark.png' },
		}
		expect(libraryItemValidator.validate(withPair)).toEqual(withPair)
	})

	it('accepts an item without a name', () => {
		const { name: _name, ...unnamed } = item
		expect(libraryItemValidator.validate(unnamed)).toEqual(unnamed)
	})

	it('rejects a blank name or thumbnail, so leaving them out is the only way to say there is none', () => {
		expect(() => libraryItemValidator.validate({ ...item, name: '  ' })).toThrow()
		expect(() => libraryItemValidator.validate({ ...item, thumbnail: '' })).toThrow()
		expect(() => libraryItemValidator.validate({ ...item, thumbnail: null })).toThrow()
		expect(() =>
			libraryItemValidator.validate({
				...item,
				thumbnail: { light: 'https://x/t.png', dark: '' },
			})
		).toThrow()
	})

	it('rejects half a pair: one image for both modes is a plain URL', () => {
		expect(() =>
			libraryItemValidator.validate({ ...item, thumbnail: { light: 'https://x/t.png' } })
		).toThrow()
	})

	it('rejects a library id that is not a library id', () => {
		expect(() => libraryItemValidator.validate({ ...item, libraryId: 'wireframes' })).toThrow()
	})

	it('rejects a non-integer version', () => {
		expect(() => libraryItemValidator.validate({ ...item, version: 1.5 })).toThrow()
	})
})

describe('parseLibraryItemContent', () => {
	it('accepts current-format content', () => {
		const value = itemContent()
		expect(parseLibraryItemContent(value)).toEqual(value)
	})

	it('accepts content without bindings', () => {
		const value = itemContent()
		delete (value.content as { bindings?: unknown }).bindings
		expect(parseLibraryItemContent(value)).toEqual(value)
	})

	it('refuses content from a newer format instead of dropping what it added', () => {
		expect(() => parseLibraryItemContent(itemContent({ formatVersion: 2 }))).toThrow(
			LibraryItemContentTooNewError
		)
	})

	it('rejects values that are not item content', () => {
		expect(() => parseLibraryItemContent(null)).toThrow()
		expect(() => parseLibraryItemContent({ content: {} })).toThrow()
		expect(() => parseLibraryItemContent(itemContent({ formatVersion: 0 }))).toThrow()
	})

	it('rejects root shape ids that are not shape ids', () => {
		const value = itemContent()
		value.content.rootShapeIds = ['page:1' as typeof shapeId]
		expect(() => parseLibraryItemContent(value)).toThrow()
	})

	it('rejects unknown envelope fields, so a newer format cannot pass as the current one', () => {
		expect(() => parseLibraryItemContent(itemContent({ parameters: [] }))).toThrow()
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
