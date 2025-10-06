import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { StyleProp } from '../styles/StyleProp'
import {
	createShapeId,
	createShapePropsMigrationIds,
	createShapeRecordType,
	getShapePropKeysByStyle,
	isShape,
	isShapeId,
	rootShapeMigrations,
	rootShapeVersions,
	TLShapeId,
} from './TLShape'

describe('rootShapeMigrations', () => {
	it('should migrate AddIsLocked correctly', () => {
		const migration = rootShapeMigrations.sequence.find(
			(m) => m.id === rootShapeVersions.AddIsLocked
		)!
		expect(migration.up).toBeDefined()
		expect(migration.down).toBeDefined()

		const record: any = { id: 'shape:test', typeName: 'shape', type: 'geo' }
		migration.up(record)
		expect(record.isLocked).toBe(false)

		migration.down!(record)
		expect(record.isLocked).toBeUndefined()
	})

	it('should migrate HoistOpacity correctly', () => {
		const migration = rootShapeMigrations.sequence.find(
			(m) => m.id === rootShapeVersions.HoistOpacity
		)!
		expect(migration.up).toBeDefined()
		expect(migration.down).toBeDefined()

		// Test up migration
		const record: any = {
			id: 'shape:test',
			typeName: 'shape',
			type: 'geo',
			props: { opacity: '0.5', color: 'red' },
		}
		migration.up(record)
		expect(record.opacity).toBe(0.5)
		expect(record.props.opacity).toBeUndefined()
		expect(record.props.color).toBe('red')

		// Test down migration
		migration.down!(record)
		expect(record.props.opacity).toBe('0.5')
		expect(record.opacity).toBeUndefined()
	})

	it('should migrate AddMeta correctly', () => {
		const migration = rootShapeMigrations.sequence.find((m) => m.id === rootShapeVersions.AddMeta)!
		const record: any = { id: 'shape:test', typeName: 'shape', type: 'geo' }
		migration.up(record)
		expect(record.meta).toEqual({})
	})

	it('should handle AddWhite migration', () => {
		const migration = rootShapeMigrations.sequence.find((m) => m.id === rootShapeVersions.AddWhite)!
		expect(migration.up).toBeDefined()
		expect(migration.down).toBeDefined()

		// Up migration is noop
		const record: any = { props: { color: 'white' } }
		const original = { ...record }
		migration.up(record)
		expect(record).toEqual(original)

		// Down migration converts white to black
		migration.down!(record)
		expect(record.props.color).toBe('black')
	})
})

describe('isShape', () => {
	it('should return true for shape records', () => {
		const shape = {
			id: 'shape:test' as TLShapeId,
			typeName: 'shape',
			type: 'geo',
			x: 0,
			y: 0,
			rotation: 0,
			index: 'a1' as any,
			parentId: 'page:main' as any,
			isLocked: false,
			opacity: 1,
			props: {},
			meta: {},
		}

		expect(isShape(shape)).toBe(true)
	})

	it('should return false for non-shape records', () => {
		const notShape = {
			id: 'page:test',
			typeName: 'page',
			name: 'Test Page',
		}

		expect(isShape(notShape as any)).toBe(false)
	})
})

describe('isShapeId', () => {
	it('should return true for valid shape IDs', () => {
		expect(isShapeId('shape:test')).toBe(true)
		expect(isShapeId('shape:abc123')).toBe(true)
		expect(isShapeId('shape:')).toBe(true)
	})

	it('should return false for invalid shape IDs', () => {
		expect(isShapeId('page:test')).toBe(false)
		expect(isShapeId('asset:test')).toBe(false)
		expect(isShapeId('invalid')).toBe(false)
		expect(isShapeId('')).toBe(false)
	})
})

describe('createShapeId', () => {
	it('should create shape IDs with auto-generated suffix', () => {
		const id1 = createShapeId()
		const id2 = createShapeId()

		expect(id1.startsWith('shape:')).toBe(true)
		expect(id2.startsWith('shape:')).toBe(true)
		expect(id1).not.toBe(id2)
		expect(id1.length).toBeGreaterThan(6) // 'shape:' + some ID
		expect(id2.length).toBeGreaterThan(6)
	})

	it('should create shape IDs with custom suffix', () => {
		const customId = createShapeId('my-custom-id')
		expect(customId).toBe('shape:my-custom-id')
	})
})

describe('getShapePropKeysByStyle', () => {
	it('should map style props to their keys', () => {
		const colorStyle = StyleProp.define('color', { defaultValue: 'black' })
		const sizeStyle = StyleProp.define('size', { defaultValue: 'm' })

		const props = {
			color: colorStyle,
			size: sizeStyle,
			width: T.number,
			height: T.number,
		}

		const styleMap = getShapePropKeysByStyle(props)
		expect(styleMap.get(colorStyle)).toBe('color')
		expect(styleMap.get(sizeStyle)).toBe('size')
		expect(styleMap.size).toBe(2) // Only style props
	})

	it('should throw error for duplicate style props', () => {
		const colorStyle = StyleProp.define('color', { defaultValue: 'black' })
		const props = {
			color1: colorStyle,
			color2: colorStyle, // Same style prop used twice
			width: T.number,
		}

		expect(() => getShapePropKeysByStyle(props)).toThrow('Duplicate style prop')
	})
})

describe('createShapePropsMigrationIds', () => {
	it('should create formatted migration IDs', () => {
		const ids = createShapePropsMigrationIds('custom', {
			AddColor: 1,
			AddSize: 2,
			RefactorProps: 3,
		})

		expect(ids.AddColor).toBe('com.tldraw.shape.custom/1')
		expect(ids.AddSize).toBe('com.tldraw.shape.custom/2')
		expect(ids.RefactorProps).toBe('com.tldraw.shape.custom/3')
	})
})

describe('createShapeRecordType', () => {
	it('should create a record type for shapes', () => {
		const shapes = {
			geo: {
				props: {
					w: T.number,
					h: T.number,
					color: StyleProp.define('color', { defaultValue: 'black' }),
				},
				meta: {},
			},
			text: {
				props: {
					text: T.string,
					size: StyleProp.define('size', { defaultValue: 'm' }),
				},
				meta: {},
			},
		}

		const ShapeRecordType = createShapeRecordType(shapes)

		expect(ShapeRecordType.typeName).toBe('shape')
		expect(ShapeRecordType.scope).toBe('document')

		// Should be able to create shapes
		const geoShape = ShapeRecordType.create({
			id: createShapeId(),
			type: 'geo',
			parentId: 'page:main' as any,
			index: 'a1' as any,
			props: {},
		})

		expect(geoShape.typeName).toBe('shape')
		expect(geoShape.type).toBe('geo')
		expect(geoShape.x).toBe(0) // Default
		expect(geoShape.y).toBe(0) // Default
		expect(geoShape.rotation).toBe(0) // Default
		expect(geoShape.isLocked).toBe(false) // Default
		expect(geoShape.opacity).toBe(1) // Default
		expect(geoShape.meta).toEqual({}) // Default
	})
})
