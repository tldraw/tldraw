import { describe, expect, it } from 'vitest'
import { createTLSchema } from '../createTLSchema'
import { AssetRecordType } from './TLAsset'
import {
	LibraryItemContentRecordType,
	libraryItemContentValidator,
	libraryItemRecordValidator,
	LibraryRecordType,
	librarySchemaRecords,
	libraryValidator,
	createLibraryItemContentId,
	TLLibraryItemId,
	TLLibraryItemRecord,
} from './TLLibrary'
import { TLShapeId } from './TLShape'

const libraryId = LibraryRecordType.createId('wireframes')
const itemId = 'library-item:card' as TLLibraryItemId
const shapeId = 'shape:box' as TLShapeId

describe('libraryValidator', () => {
	const library = LibraryRecordType.create({ id: libraryId, name: 'Wireframes' })

	it('accepts a library', () => {
		expect(libraryValidator.validate(library)).toEqual(library)
	})

	it('accepts an owner, but not a blank one', () => {
		expect(libraryValidator.validate({ ...library, ownerId: 'acme' })).toEqual({
			...library,
			ownerId: 'acme',
		})
		expect(() => libraryValidator.validate({ ...library, ownerId: ' ' })).toThrow()
	})

	it('rejects a readOnly flag, which a library no longer has', () => {
		expect(() => libraryValidator.validate({ ...library, readOnly: true })).toThrow()
	})

	it('rejects a blank name', () => {
		expect(() => libraryValidator.validate({ ...library, name: '  ' })).toThrow()
	})

	it('rejects an id that is not a library id', () => {
		expect(() => libraryValidator.validate({ ...library, id: 'wireframes' })).toThrow()
	})

	it('rejects unknown properties', () => {
		expect(() => libraryValidator.validate({ ...library, color: 'red' })).toThrow()
	})
})

describe('libraryItemRecordValidator', () => {
	const item: TLLibraryItemRecord = {
		id: itemId,
		typeName: 'library-item',
		libraryId,
		name: 'Card',
		thumbnail: {
			light: AssetRecordType.createId('light'),
			dark: AssetRecordType.createId('dark'),
		},
		version: 1,
		meta: {},
	}

	it('accepts an item whose thumbnail names one asset or a light and dark pair', () => {
		expect(libraryItemRecordValidator.validate(item)).toEqual(item)
		const withOne = { ...item, thumbnail: AssetRecordType.createId('one') }
		expect(libraryItemRecordValidator.validate(withOne)).toEqual(withOne)
		const { thumbnail: _thumbnail, ...without } = item
		expect(libraryItemRecordValidator.validate(without)).toEqual(without)
	})

	it('rejects a thumbnail that is a URL rather than an asset id', () => {
		expect(() =>
			libraryItemRecordValidator.validate({ ...item, thumbnail: 'https://x/t.png' })
		).toThrow()
		expect(() =>
			libraryItemRecordValidator.validate({
				...item,
				thumbnail: { light: 'data:image/png;base64,AA', dark: 'data:image/png;base64,AA' },
			})
		).toThrow()
	})

	it('rejects a blank name and a library id that is not a library id', () => {
		expect(() => libraryItemRecordValidator.validate({ ...item, name: ' ' })).toThrow()
		expect(() =>
			libraryItemRecordValidator.validate({ ...item, libraryId: 'wireframes' })
		).toThrow()
	})
})

describe('libraryItemContentValidator', () => {
	const content = LibraryItemContentRecordType.create({
		id: createLibraryItemContentId(itemId),
		itemId,
		content: {
			shapes: [{ id: shapeId, type: 'geo', x: 0, y: 0, props: {} } as any],
			rootShapeIds: [shapeId],
			schema: createTLSchema().serialize(),
		},
		assetIds: [AssetRecordType.createId('photo')],
	})

	it('accepts content that names its assets', () => {
		expect(libraryItemContentValidator.validate(content)).toEqual(content)
	})

	it('rejects content that carries its assets inline', () => {
		expect(() =>
			libraryItemContentValidator.validate({
				...content,
				content: { ...content.content, assets: [] },
			})
		).toThrow()
	})

	it('rejects asset ids and root shape ids of the wrong type', () => {
		expect(() =>
			libraryItemContentValidator.validate({ ...content, assetIds: ['shape:box'] })
		).toThrow()
		expect(() =>
			libraryItemContentValidator.validate({
				...content,
				content: { ...content.content, rootShapeIds: ['page:1'] },
			})
		).toThrow()
	})
})

describe('createLibraryItemContentId', () => {
	it("keys an item's content by the item's id", () => {
		expect(createLibraryItemContentId(itemId)).toBe('library-item-content:card')
	})
})

describe('schema registration', () => {
	const schema = createTLSchema({ records: librarySchemaRecords })

	it('registers the three record types as document records', () => {
		const types = schema.types as Record<string, { scope: string } | undefined>
		expect(types['library']?.scope).toBe('document')
		expect(types['library-item']?.scope).toBe('document')
		expect(types['library-item-content']?.scope).toBe('document')
	})

	it("can't send library records to a schema that predates them", () => {
		const library = LibraryRecordType.create({ id: libraryId, name: 'Wireframes' })
		const result = schema.migratePersistedRecord(
			library as any,
			createTLSchema().serialize(),
			'down'
		)
		expect(result.type).toBe('error')
	})
})
