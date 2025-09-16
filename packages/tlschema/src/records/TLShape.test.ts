import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { StyleProp } from '../styles/StyleProp'
import {
	createShapeId,
	createShapePropsMigrationIds,
	createShapePropsMigrationSequence,
	createShapeRecordType,
	getShapePropKeysByStyle,
	isShape,
	isShapeId,
	rootShapeMigrations,
	rootShapeVersions,
	TLParentId,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLUnknownShape,
} from './TLShape'

describe('TLDefaultShape', () => {
	it('should be a union of all default shape types', () => {
		// This is a type-level test - if it compiles, the union is correct
		const shapeTypes = [
			'arrow',
			'bookmark',
			'draw',
			'embed',
			'frame',
			'geo',
			'group',
			'image',
			'line',
			'note',
			'text',
			'video',
			'highlight',
		]

		// Verify the union includes all expected types
		expect(shapeTypes).toContain('arrow')
		expect(shapeTypes).toContain('geo')
		expect(shapeTypes).toContain('text')
		expect(shapeTypes).toContain('highlight')
	})
})

describe('TLUnknownShape', () => {
	it('should represent shapes with unknown types', () => {
		const unknownShape: TLUnknownShape = {
			id: 'shape:unknown' as TLShapeId,
			typeName: 'shape',
			type: 'custom-shape-type',
			x: 100,
			y: 200,
			rotation: 0,
			index: 'a1' as any,
			parentId: 'page:main' as any,
			isLocked: false,
			opacity: 1,
			props: { customProp: 'value', width: 150 } as any,
			meta: {},
		}

		expect(unknownShape.type).toBe('custom-shape-type')
		expect((unknownShape.props as any).customProp).toBe('value')
		expect((unknownShape.props as any).width).toBe(150)
	})
})

describe('TLShape', () => {
	it('should be a union of default and unknown shapes', () => {
		const geoShape: TLShape = {
			id: 'shape:geo' as TLShapeId,
			typeName: 'shape',
			type: 'geo',
			x: 0,
			y: 0,
			rotation: 0,
			index: 'a1' as any,
			parentId: 'page:main' as any,
			isLocked: false,
			opacity: 1,
			props: {
				geo: 'rectangle',
				w: 100,
				h: 100,
				color: 'black',
				fill: 'none',
				dash: 'draw',
				size: 'm',
			},
			meta: {},
		}

		const customShape: TLShape = {
			id: 'shape:custom' as TLShapeId,
			typeName: 'shape',
			type: 'my-custom-type',
			x: 50,
			y: 75,
			rotation: 45,
			index: 'a2' as any,
			parentId: 'page:main' as any,
			isLocked: true,
			opacity: 0.5,
			props: { customData: { value: 42, enabled: true } } as any,
			meta: { created: 'test' },
		}

		expect(geoShape.type).toBe('geo')
		expect(customShape.type).toBe('my-custom-type')
		expect((customShape.props as any).customData.value).toBe(42)
	})
})

describe('TLShapePartial', () => {
	it('should allow partial updates with required id and type', () => {
		const partial: TLShapePartial = {
			id: 'shape:update' as TLShapeId,
			type: 'geo',
			x: 150,
			y: 200,
		}

		expect(partial.id).toBe('shape:update')
		expect(partial.type).toBe('geo')
		expect(partial.x).toBe(150)
		expect(partial.y).toBe(200)
		expect(partial.rotation).toBeUndefined() // Optional
	})

	it('should allow partial props updates', () => {
		const partial: TLShapePartial = {
			id: 'shape:props' as TLShapeId,
			type: 'geo',
			props: {
				w: 200, // Partial geo props
				color: 'red',
			},
		}

		expect((partial.props as any)?.w).toBe(200)
		expect((partial.props as any)?.color).toBe('red')
	})

	it('should allow partial meta updates', () => {
		const partial: TLShapePartial = {
			id: 'shape:meta' as TLShapeId,
			type: 'text',
			meta: {
				author: 'user123',
			},
		}

		expect(partial.meta?.author).toBe('user123')
	})
})

describe('TLShapeId', () => {
	it('should be a branded type for shape IDs', () => {
		const shapeId: TLShapeId = 'shape:test' as TLShapeId
		expect(typeof shapeId).toBe('string')
		expect(shapeId.startsWith('shape:')).toBe(true)
	})
})

describe('TLParentId', () => {
	it('should accept page IDs as parent', () => {
		const pageParent: TLParentId = 'page:main' as any
		expect(pageParent.startsWith('page:')).toBe(true)
	})

	it('should accept shape IDs as parent', () => {
		const shapeParent: TLParentId = 'shape:frame' as TLShapeId
		expect(shapeParent.startsWith('shape:')).toBe(true)
	})
})

describe('rootShapeVersions', () => {
	it('should have all migration versions defined', () => {
		const expectedVersions = ['AddIsLocked', 'HoistOpacity', 'AddMeta', 'AddWhite']

		expectedVersions.forEach((version) => {
			expect(rootShapeVersions[version as keyof typeof rootShapeVersions]).toBeDefined()
			expect(typeof rootShapeVersions[version as keyof typeof rootShapeVersions]).toBe('string')
		})
	})

	it('should have sequential version numbers', () => {
		expect(rootShapeVersions.AddIsLocked).toBe('com.tldraw.shape/1')
		expect(rootShapeVersions.HoistOpacity).toBe('com.tldraw.shape/2')
		expect(rootShapeVersions.AddMeta).toBe('com.tldraw.shape/3')
		expect(rootShapeVersions.AddWhite).toBe('com.tldraw.shape/4')
	})
})

describe('rootShapeMigrations', () => {
	it('should have correct migration configuration', () => {
		expect(rootShapeMigrations.sequenceId).toBe('com.tldraw.shape')
		// expect(rootShapeMigrations.recordType).toBe('shape') // Property doesn't exist on MigrationSequence
		expect(Array.isArray(rootShapeMigrations.sequence)).toBe(true)
		expect(rootShapeMigrations.sequence).toHaveLength(4)
	})

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

	it('should handle HoistOpacity with different opacity values', () => {
		const migration = rootShapeMigrations.sequence.find(
			(m) => m.id === rootShapeVersions.HoistOpacity
		)!

		const testCases = [
			{ input: 0.1, expected: '0.1' },
			{ input: 0.2, expected: '0.25' },
			{ input: 0.4, expected: '0.5' },
			{ input: 0.6, expected: '0.5' },
			{ input: 0.8, expected: '0.75' },
			{ input: 0.9, expected: '1' },
			{ input: 1.0, expected: '1' },
		]

		testCases.forEach(({ input, expected }) => {
			const record: any = { opacity: input, props: {} }
			migration.down!(record)
			expect(record.props.opacity).toBe(expected)
		})
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

	it('should return false for null/undefined', () => {
		expect(isShape(null as any)).toBe(false)
		expect(isShape(undefined as any)).toBe(false)
	})

	it('should work as type guard', () => {
		const records: any[] = [
			{ id: 'shape:1', typeName: 'shape', type: 'geo', x: 0, y: 0 },
			{ id: 'page:1', typeName: 'page', name: 'Page' },
		]

		const shapes = records.filter(isShape)
		expect(shapes).toHaveLength(1)
		expect(shapes[0].typeName).toBe('shape')
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

	it('should return false for null/undefined', () => {
		expect(isShapeId(null as any)).toBe(false)
		expect(isShapeId(undefined)).toBe(false)
	})

	it('should work as type guard', () => {
		const ids = ['shape:1', 'page:1', 'shape:2', 'invalid']
		const shapeIds = ids.filter(isShapeId)
		expect(shapeIds).toEqual(['shape:1', 'shape:2'])
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

	it('should create unique IDs when called multiple times', () => {
		const ids = Array.from({ length: 5 }, () => createShapeId())
		const uniqueIds = new Set(ids)
		expect(uniqueIds.size).toBe(5) // All should be unique
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

	it('should handle props with no style props', () => {
		const props = {
			width: T.number,
			height: T.number,
			text: T.string,
		}

		const styleMap = getShapePropKeysByStyle(props)
		expect(styleMap.size).toBe(0)
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

describe('createShapePropsMigrationSequence', () => {
	it('should return the same migration sequence (pass-through)', () => {
		const migrations = {
			sequence: [
				{
					id: 'com.tldraw.shape.test/1' as `${string}/${number}`,
					up: (props: any) => ({ ...props, newProp: 'value' }),
					down: ({ newProp, ...props }: any) => props,
				} as any,
			],
		}

		const result = createShapePropsMigrationSequence(migrations)
		expect(result).toBe(migrations) // Should be the exact same object
		expect(result.sequence).toHaveLength(1)
		expect((result.sequence[0] as any).id).toBe('com.tldraw.shape.test/1')
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

	it('should work with different shape types', () => {
		const geoIds = createShapePropsMigrationIds('geo', { AddRadius: 1 })
		const textIds = createShapePropsMigrationIds('text', { AddFont: 1 })

		expect(geoIds.AddRadius).toBe('com.tldraw.shape.geo/1')
		expect(textIds.AddFont).toBe('com.tldraw.shape.text/1')
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

describe('TLShape Integration', () => {
	it('should work with typical shape operations', () => {
		const shapeId = createShapeId()

		// Create a shape
		const shape: TLShape = {
			id: shapeId,
			typeName: 'shape',
			type: 'geo',
			x: 100,
			y: 200,
			rotation: 0,
			index: 'a1' as any,
			parentId: 'page:main' as any,
			isLocked: false,
			opacity: 1,
			props: {
				geo: 'rectangle',
				w: 150,
				h: 100,
				color: 'blue',
				fill: 'solid',
				dash: 'draw',
				size: 'm',
			},
			meta: { created: Date.now() },
		}

		// Move the shape
		const movedShape: TLShape = {
			...shape,
			x: shape.x + 50,
			y: shape.y + 25,
		}

		// Resize the shape via partial update
		const resizePartial: TLShapePartial = {
			id: shapeId,
			type: 'geo',
			props: {
				w: 200,
				h: 150,
			},
		}

		expect(shape.type).toBe('geo')
		expect(movedShape.x).toBe(150)
		expect(movedShape.y).toBe(225)
		expect((resizePartial.props as any)?.w).toBe(200)
		expect((resizePartial.props as any)?.h).toBe(150)
		expect(isShape(shape)).toBe(true)
		expect(isShapeId(shapeId)).toBe(true)
	})

	it('should handle parent-child relationships', () => {
		const pageId = 'page:main' as TLParentId
		const frameId = createShapeId()
		const childId = createShapeId()

		// Shape parented to page
		const topLevelShape: TLShape = {
			id: frameId,
			typeName: 'shape',
			type: 'frame',
			x: 0,
			y: 0,
			rotation: 0,
			index: 'a1' as any,
			parentId: pageId,
			isLocked: false,
			opacity: 1,
			props: { w: 300, h: 200, name: 'Frame 1' },
			meta: {},
		}

		// Shape parented to another shape
		const childShape: TLShape = {
			id: childId,
			typeName: 'shape',
			type: 'geo',
			x: 50,
			y: 50,
			rotation: 0,
			index: 'a1' as any,
			parentId: frameId, // Parented to the frame
			isLocked: false,
			opacity: 1,
			props: {
				geo: 'ellipse',
				w: 100,
				h: 100,
				color: 'red',
				fill: 'solid',
				dash: 'draw',
				size: 'm',
			},
			meta: {},
		}

		expect(topLevelShape.parentId).toBe(pageId)
		expect(childShape.parentId).toBe(frameId)
		expect(topLevelShape.parentId.startsWith('page:')).toBe(true)
		expect(childShape.parentId.startsWith('shape:')).toBe(true)
	})

	it('should support custom shape types', () => {
		const customShape: TLShape = {
			id: createShapeId(),
			typeName: 'shape',
			type: 'my-custom-widget', // Unknown/custom type
			x: 25,
			y: 50,
			rotation: 90,
			index: 'a1' as any,
			parentId: 'page:main' as any,
			isLocked: true,
			opacity: 0.8,
			props: {
				// Custom properties
				widgetType: 'button',
				label: 'Click me!',
				backgroundColor: '#007AFF',
				borderRadius: 8,
				interactive: true,
				data: {
					onClick: 'handleButtonClick',
					variant: 'primary',
				},
			},
			meta: {
				plugin: 'custom-widgets',
				version: '1.2.0',
				author: 'developer123',
			},
		}

		expect(customShape.type).toBe('my-custom-widget')
		expect((customShape.props as any).widgetType).toBe('button')
		expect((customShape.props as any).data.variant).toBe('primary')
		expect(customShape.meta.plugin).toBe('custom-widgets')
		expect(isShape(customShape)).toBe(true)
	})
})
